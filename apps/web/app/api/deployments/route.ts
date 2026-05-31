import { NextResponse } from "next/server";
import { deployments } from "../../../lib/deployments";

export function GET() {
  return NextResponse.json({
    networks: Object.entries(deployments).map(([key, deployment]) => ({
      key,
      ...deployment
    }))
  });
}
