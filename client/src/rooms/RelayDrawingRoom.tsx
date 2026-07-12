import "./LiarRoom.css";

type RelayDrawingSettings = {
  gameDuration: number;
  prepareTime: number;
  turnDuration: number;
  finalGuessTime: number;
  wordVisibility:
    | "ALL_DRAWERS"
    | "FIRST_DRAWER_ONLY";
};

type RelayDrawingRoomProps = {
  settings: RelayDrawingSettings;
  isHost: boolean;
  onUpdateSetting: (
    key: keyof RelayDrawingSettings,
    value:
      | number
      | RelayDrawingSettings["wordVisibility"],
  ) => void;
};

export default function RelayDrawingRoom({
  settings,
  isHost,
  onUpdateSetting,
}: RelayDrawingRoomProps) {
  return (
    <section className="liar-settings-panel">
      <h2>릴레이 드로잉 설정</h2>

      <div className="liar-setting-grid">
        <SettingRow
          label="전체 게임 시간"
          value={settings.gameDuration}
          min={60}
          max={900}
          disabled={!isHost}
          suffix="초"
          onChange={(value) =>
            onUpdateSetting(
              "gameDuration",
              value,
            )
          }
        />

        <SettingRow
          label="문제 준비 시간"
          value={settings.prepareTime}
          min={3}
          max={10}
          disabled={!isHost}
          suffix="초"
          onChange={(value) =>
            onUpdateSetting(
              "prepareTime",
              value,
            )
          }
        />

        <SettingRow
          label="1인당 그림 시간"
          value={settings.turnDuration}
          min={5}
          max={60}
          disabled={!isHost}
          suffix="초"
          onChange={(value) =>
            onUpdateSetting(
              "turnDuration",
              value,
            )
          }
        />

        <SettingRow
          label="최종 정답 시간"
          value={settings.finalGuessTime}
          min={3}
          max={20}
          disabled={!isHost}
          suffix="초"
          onChange={(value) =>
            onUpdateSetting(
              "finalGuessTime",
              value,
            )
          }
        />

        <div className="liar-setting-row">
          <label>제시어 공개 방식</label>

          <div className="liar-setting-control">
            <select
              value={settings.wordVisibility}
              disabled={!isHost}
              onChange={(event) =>
                onUpdateSetting(
                  "wordVisibility",
                  event.target.value as
                    RelayDrawingSettings["wordVisibility"],
                )
              }
            >
              <option value="ALL_DRAWERS">
                그림 담당자 전원 공개
              </option>

              <option value="FIRST_DRAWER_ONLY">
                첫 번째 그림 담당자만 공개
              </option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingRow({
  label,
  value,
  min,
  max,
  disabled,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="liar-setting-row">
      <label>{label}</label>

      <div className="liar-setting-control">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              Number(event.target.value),
            )
          }
        />

        <span>{suffix ?? ""}</span>
      </div>
    </div>
  );
}