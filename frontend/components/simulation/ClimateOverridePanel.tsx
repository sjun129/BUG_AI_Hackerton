"use client";

import type { ClimateOverrideInput } from "@/frontend/types/route-scenario";
import { LT } from "@/frontend/components/theme";

const muted = LT.muted;
const ink = LT.ink;
const purple = "#9333ea";

const DEFAULT_WAVE_M = 1.5;
const DEFAULT_WIND_MS = 10;
const DEFAULT_TYPHOON_KM = 100;

interface ClimateOverridePanelProps {
  value: ClimateOverrideInput;
  onChange: (next: ClimateOverrideInput) => void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          position: "relative",
          width: 34,
          height: 19,
          borderRadius: 999,
          background: checked ? purple : "rgba(100,116,139,.28)",
          transition: "background .15s",
          flex: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 17 : 2,
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .15s",
            boxShadow: "0 1px 3px rgba(15,23,42,.3)",
          }}
        />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: ink }}>{label}</span>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ opacity: disabled ? 0.45 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: muted }}>
        <span>{label}</span>
        <span style={{ color: purple, fontWeight: 800 }}>
          {value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 4, accentColor: purple, cursor: disabled ? "not-allowed" : "pointer" }}
      />
    </div>
  );
}

export default function ClimateOverridePanel({ value, onChange }: ClimateOverridePanelProps) {
  const typhoonOn = value.typhoonDistanceKm != null;

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${value.enabled ? "rgba(147,51,234,.28)" : LT.borderColor}`,
        background: value.enabled ? "rgba(147,51,234,.05)" : LT.tile,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Toggle
          checked={value.enabled}
          onChange={(enabled) =>
            // 켜는 순간 슬라이더에 "표시되는" 기본값을 실제 상태로 커밋한다 — 그렇지 않으면
            // 사용자가 슬라이더를 건드리지 않은 항목은 undefined인 채로 전송돼, 화면엔
            // 1.5m/10m/s가 보여도 실제 계산엔 반영되지 않는 불일치가 생긴다.
            onChange(
              enabled
                ? { ...value, enabled, waveHeightM: value.waveHeightM ?? DEFAULT_WAVE_M, windSpeedMs: value.windSpeedMs ?? DEFAULT_WIND_MS }
                : { ...value, enabled }
            )
          }
          label="가상 기후 시나리오"
        />
        {value.enabled && (
          <span style={{ fontSize: 10, fontWeight: 800, color: purple, background: "rgba(147,51,234,.12)", padding: "2px 7px", borderRadius: 999 }}>
            SIMULATION
          </span>
        )}
      </div>

      {!value.enabled ? (
        <p style={{ margin: "6px 0 0", color: muted, fontSize: 11, lineHeight: 1.45 }}>
          꺼져 있으면 실시간 해양 데이터(파랑·태풍)를 그대로 사용합니다. 켜면 아래 슬라이더 값으로 해상 리스크와 AI 계산 경로를 시뮬레이션합니다.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <Slider
            label="유의파고"
            value={value.waveHeightM ?? DEFAULT_WAVE_M}
            min={0}
            max={8}
            step={0.1}
            unit="m"
            onChange={(waveHeightM) => onChange({ ...value, waveHeightM })}
          />
          <Slider
            label="풍속"
            value={value.windSpeedMs ?? DEFAULT_WIND_MS}
            min={0}
            max={40}
            step={0.5}
            unit="m/s"
            onChange={(windSpeedMs) => onChange({ ...value, windSpeedMs })}
          />

          <div>
            <Toggle
              checked={typhoonOn}
              onChange={(on) => onChange({ ...value, typhoonDistanceKm: on ? DEFAULT_TYPHOON_KM : undefined })}
              label="가상 태풍 배치"
            />
            <div style={{ marginTop: 8 }}>
              <Slider
                label="선박 진행방향 기준 거리"
                value={value.typhoonDistanceKm ?? DEFAULT_TYPHOON_KM}
                min={20}
                max={500}
                step={10}
                unit="km"
                disabled={!typhoonOn}
                onChange={(typhoonDistanceKm) => onChange({ ...value, typhoonDistanceKm })}
              />
            </div>
          </div>

          <p style={{ margin: 0, color: muted, fontSize: 10.5, lineHeight: 1.4 }}>
            이 값은 해상 리스크 점수와 AI 계산 경로(태풍 회피)에 반영됩니다. 지정항로 자체의 좌표는 바뀌지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}
