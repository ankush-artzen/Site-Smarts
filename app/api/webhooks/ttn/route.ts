
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);


function safeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) return false;

  let result = 0;

  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

function isAuthorized(request: NextRequest) {
  const username = process.env.TTN_WEBHOOK_USERNAME;
  const password = process.env.TTN_WEBHOOK_PASSWORD;

  if (!username || !password) return false;

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");

    if (separator === -1) return false;

    const receivedUsername = decoded.slice(0, separator);
    const receivedPassword = decoded.slice(separator + 1);

    return (
      safeEqual(receivedUsername, username) &&
      safeEqual(receivedPassword, password)
    );
  } catch {
    return false;
  }
}

type TTNUplink = {
  end_device_ids?: {
    device_id?: string;
    dev_eui?: string;
    application_ids?: {
      application_id?: string;
    };
  };
  received_at?: string;
  uplink_message?: {
    f_cnt?: number;
    decoded_payload?: {
      battery_voltage?: number;
      distance_mm?: number;
      distance_valid?: boolean;
      sensor_detected?: boolean;
      interrupt?: number;
    };
    rx_metadata?: Array<{
      rssi?: number;
      snr?: number;
    }>;
  };
};

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let event: { data?: TTNUplink } & TTNUplink;
    try {
      event = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Expected a JSON body" },
        { status: 400 }
      );
    }

    if (!event || typeof event !== "object") {
      return NextResponse.json(
        { error: "Expected a JSON object" },
        { status: 400 }
      );
    }

    const ttnData = (event.data ?? event) as TTNUplink;

    const deviceIds = ttnData.end_device_ids;
    const uplink = ttnData.uplink_message;
    const decoded = uplink?.decoded_payload;

    const devEui = deviceIds?.dev_eui;

    if (!devEui || !uplink || !decoded) {
      return NextResponse.json(
        { error: "Missing device identity or decoded payload" },
        { status: 400 }
      );
    }

    const distance = Number(decoded.distance_mm);
    const battery = Number(decoded.battery_voltage);

    if (
      decoded.distance_valid !== true ||
      decoded.sensor_detected !== true ||
      !Number.isFinite(distance) ||
      distance < 0 ||
      !Number.isFinite(battery) ||
      battery <= 0
    ) {
      return NextResponse.json(
        { message: "Invalid sensor reading; ignored" },
        { status: 200 }
      );
    }

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, organization_id, site_id")
      .eq("dev_eui", devEui.toUpperCase())
      .maybeSingle();

    if (deviceError) {
      console.error("Device lookup failed:", deviceError);

      return NextResponse.json(
        { error: "Device lookup failed" },
        { status: 500 }
      );
    }

    if (!device) {
      console.warn("Unregistered TTN device:", devEui);

      return NextResponse.json(
        { message: "Device not registered; event ignored" },
        { status: 200 }
      );
    }

    const { data: tanks, error: tankError } = await supabase
      .from("tanks")
      .select("id")
      .eq("sensor_device_id", device.id)
      .eq("is_active", true)
      .limit(2);

    if (tankError) {
      console.error("Tank lookup failed:", tankError);

      return NextResponse.json(
        { error: "Tank lookup failed" },
        { status: 500 }
      );
    }

    const tankId = tanks?.length === 1 ? tanks[0].id : null;

    const metadata = uplink.rx_metadata ?? [];

    const strongestReception = metadata.reduce<
      (typeof metadata)[number] | null
    >((best, current) => {
      if (typeof current.rssi !== "number") return best;

      if (!best || current.rssi > (best.rssi ?? -Infinity)) {
        return current;
      }

      return best;
    }, null);

    const receivedAt =
      ttnData.received_at ?? new Date().toISOString();

    const { error: readingError } = await supabase
      .from("sensor_readings")
      .insert({
        organization_id: device.organization_id,
        site_id: device.site_id,
        device_id: device.id,
        tank_id: tankId,

        distance_mm: distance,
        battery_voltage: battery,

        rssi: strongestReception?.rssi ?? null,
        snr: strongestReception?.snr ?? null,

        frame_counter: uplink.f_cnt ?? null,

        raw_payload: event,

        received_at: receivedAt,
      });

    if (readingError) {
      console.error("Reading insert failed:", readingError);

      return NextResponse.json(
        { error: "Failed to save sensor reading" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("devices")
      .update({
        status: "online",
        battery_voltage: battery,
        last_seen_at: receivedAt,
        last_frame_counter: uplink.f_cnt ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", device.id);

    if (updateError) {
      console.error("Device update failed:", updateError);

      return NextResponse.json(
        { error: "Reading saved, but device update failed" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "TTN reading saved successfully",
      device: devEui,
      distance_mm: distance,
      battery_voltage: battery,
      tank_id: tankId,
    });
  } catch (error) {
    console.error("TTN webhook error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
