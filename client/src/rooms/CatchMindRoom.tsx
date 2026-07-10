import "./LiarRoom.css";

type CatchMindSettings = {
  roundCount: number;
  wordSelectTime: number;
  drawingTime: number;
  roundResultTime: number;
  allowDrawerSkip: boolean;
};

type CatchMindRoomProps = {
  settings: CatchMindSettings;
  isHost: boolean;
  onUpdateSetting: (
    key: keyof CatchMindSettings,
    value: number | boolean
  ) => void;
};

export default function CatchMindRoom({
  settings,
  isHost,
  onUpdateSetting,
}: CatchMindRoomProps) {
  return (
    <section className="liar-settings-panel">
      <h2>캐치마인드 설정</h2>

      <div className="liar-setting-grid">
        <SettingRow
          label="라운드 수"
          value={settings.roundCount}
          min={1}
          max={10}
          disabled={!isHost}
          onChange={(value) => onUpdateSetting("roundCount", value)}
        />

        <SettingRow
          label="단어 선택 시간"
          value={settings.wordSelectTime}
          min={5}
          max={30}
          disabled={!isHost}
          suffix="초"
          onChange={(value) => onUpdateSetting("wordSelectTime", value)}
        />

        <SettingRow
          label="그림 시간"
          value={settings.drawingTime}
          min={30}
          max={180}
          disabled={!isHost}
          suffix="초"
          onChange={(value) => onUpdateSetting("drawingTime", value)}
        />

        <SettingRow
          label="결과 시간"
          value={settings.roundResultTime}
          min={3}
          max={10}
          disabled={!isHost}
          suffix="초"
          onChange={(value) => onUpdateSetting("roundResultTime", value)}
        />

        <div className="liar-setting-row">
          <label>출제자 스킵</label>

          <div className="liar-setting-control">
            <input
              type="checkbox"
              checked={settings.allowDrawerSkip}
              disabled={!isHost}
              onChange={(event) =>
                onUpdateSetting(
                  "allowDrawerSkip",
                  event.target.checked
                )
              }
            />

            <span>
              {settings.allowDrawerSkip ? "허용" : "허용 안 함"}
            </span>
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
            onChange(Number(event.target.value))
          }
        />

        <span>{suffix ?? ""}</span>
      </div>
    </div>
  );
}