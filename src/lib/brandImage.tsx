import { ImageResponse } from "next/og";

export const BRAND_IMAGE_SIZE = { width: 1200, height: 630 };
export const BRAND_IMAGE_CONTENT_TYPE = "image/png";
export const BRAND_IMAGE_ALT =
  "FlowSync — the driver-owned marketplace for every kind of delivery";

const SERVICES = [
  "Grocery",
  "Food",
  "Furniture",
  "Courier",
  "Pharmacy",
  "Senior errands",
  "Moving",
  "Auto parts",
];

export function renderBrandImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07090b",
          backgroundImage:
            "radial-gradient(900px 500px at 50% -10%, rgba(37,224,122,0.22), rgba(37,224,122,0))",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#25e07a",
              color: "#04130a",
              fontSize: "36px",
              fontWeight: 800,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, color: "#f4f7f5" }}>
            Flow<span style={{ color: "#25e07a" }}>Sync</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: "78px",
              fontWeight: 800,
              lineHeight: 1.05,
              color: "#f4f7f5",
              letterSpacing: "-2px",
            }}
          >
            Drive every kind of delivery,{" "}
            <span style={{ color: "#25e07a" }}>&nbsp;your way.</span>
          </div>
          <div style={{ display: "flex", fontSize: "30px", color: "#9aa6a0" }}>
            The driver-owned marketplace. Keep more of every job.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", maxWidth: "780px" }}>
            {SERVICES.map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  fontSize: "22px",
                  color: "#cdd6d1",
                  border: "1px solid #20262d",
                  background: "#0e1114",
                  borderRadius: "999px",
                  padding: "8px 18px",
                }}
              >
                {s}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: "26px", fontWeight: 700, color: "#25e07a" }}>
            flowsyncdriver.com
          </div>
        </div>
      </div>
    ),
    { ...BRAND_IMAGE_SIZE }
  );
}
