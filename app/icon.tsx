import { ImageResponse } from "next/og";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ alignItems: "center", background: "#10243f", color: "#fcfdfe", display: "flex", fontFamily: "sans-serif", fontSize: 21, fontWeight: 700, height: "100%", justifyContent: "center", width: "100%" }}>M</div>, { ...size }); }
