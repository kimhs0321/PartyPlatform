import "./LiarRoom.css";

type LiarSettings = {
  liarCount: number;
  roundCount: number;
  descriptionTime: number;
  descriptionCycleCount: number;
  discussionTime: number;
  voteTime: number;
  tieSpeechTime: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
};

type LiarRoomProps = {
  settings: LiarSettings;
  playersCount: number;
  isHost: boolean;
  onUpdateSetting: (key: keyof LiarSettings, value: number) => void;
};

export default function LiarRoom({
  settings,
  playersCount,
  isHost,
  onUpdateSetting,
}: LiarRoomProps) {
  return (
    <section className="liar-settings-panel">
      <h2>라이어 게임 설정</h2>

      <div className="liar-setting-grid">
        <SettingRow
          label="라이어 수"
          value={settings.liarCount}
          min={1}
          max={Math.max(1, playersCount - 1)}
          disabled={!isHost}
          onChange={(value) => onUpdateSetting("liarCount", value)}
        />

        <SettingRow
          label="라운드 수"
          value={settings.roundCount}
          min={1}
          max={10}
          disabled={!isHost}
          onChange={(value) => onUpdateSetting("roundCount", value)}
        />

        <SettingRow
          label="설명 시간"
          value={settings.descriptionTime}
          min={20}
          max={120}
          disabled={!isHost}
          suffix="초"
          onChange={(value) => onUpdateSetting("descriptionTime", value)}
        />

        <SettingRow
          label="설명 바퀴"
          value={settings.descriptionCycleCount}
          min={1}
          max={3}
          disabled={!isHost}
          onChange={(value) =>
            onUpdateSetting("descriptionCycleCount", value)
          }
        />

        <SettingRow
          label="토론 시간"
          value={settings.discussionTime}
          min={30}
          max={300}
          disabled={!isHost}
          suffix="초"
          onChange={(value) => onUpdateSetting("discussionTime", value)}
        />

        <SettingRow
          label="투표 시간"
          value={settings.voteTime}
          min={10}
          max={120}
          disabled={!isHost}
          suffix="초"
          onChange={(value) => onUpdateSetting("voteTime", value)}
        />
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
          onChange={(e) => onChange(Number(e.target.value))}
        />

        {suffix && <span>{suffix}</span>}
      </div>
    </div>
  );
}