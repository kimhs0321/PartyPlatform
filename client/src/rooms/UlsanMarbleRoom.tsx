import "./LiarRoom.css";

export type UlsanMarbleRoundLimit =
  | 30
  | 50
  | 70
  | null;

export type UlsanMarbleSettings = {
  startingMoney: number;
  salary: number;
  roundLimit: UlsanMarbleRoundLimit;
};

type UlsanMarbleRoomProps = {
  settings: UlsanMarbleSettings;
  isHost: boolean;

  onUpdateSetting: <
    K extends keyof UlsanMarbleSettings,
  >(
    key: K,
    value: UlsanMarbleSettings[K],
  ) => void;
};

export default function UlsanMarbleRoom({
  settings,
  isHost,
  onUpdateSetting,
}: UlsanMarbleRoomProps) {
  return (
    <section className="liar-settings-panel">
      <h2>울산마블 설정</h2>

      <div className="liar-setting-grid">
        <MoneySettingRow
          label="시작 금액"
          value={settings.startingMoney}
          step={100}
          disabled={!isHost}
          onChange={(value) =>
            onUpdateSetting(
              "startingMoney",
              value,
            )
          }
        />

        <MoneySettingRow
          label="월급 금액"
          value={settings.salary}
          step={10}
          disabled={!isHost}
          onChange={(value) =>
            onUpdateSetting(
              "salary",
              value,
            )
          }
        />

        <RoundLimitSettingRow
          value={settings.roundLimit}
          disabled={!isHost}
          onChange={(value) =>
            onUpdateSetting(
              "roundLimit",
              value,
            )
          }
        />
      </div>
    </section>
  );
}

function MoneySettingRow({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const valueInTenThousands =
    value / 10_000;

  return (
    <div className="liar-setting-row">
      <label>{label}</label>

      <div className="liar-setting-control">
        <input
          type="number"
          min={0}
          step={step}
          value={valueInTenThousands}
          disabled={disabled}
          onChange={(event) => {
            const nextValue =
              Number(event.target.value) *
              10_000;

            onChange(nextValue);
          }}
        />

        <span>만원</span>
      </div>
    </div>
  );
}

function RoundLimitSettingRow({
  value,
  disabled,
  onChange,
}: {
  value: UlsanMarbleRoundLimit;
  disabled: boolean;
  onChange: (
    value: UlsanMarbleRoundLimit,
  ) => void;
}) {
  return (
    <div className="liar-setting-row">
      <label>제한 라운드</label>

      <div className="liar-setting-control">
        <select
          value={
            value === null
              ? "UNLIMITED"
              : String(value)
          }
          disabled={disabled}
          onChange={(event) => {
            const selectedValue =
              event.target.value;

            if (
              selectedValue ===
              "UNLIMITED"
            ) {
              onChange(null);
              return;
            }

            onChange(
              Number(
                selectedValue,
              ) as Exclude<
                UlsanMarbleRoundLimit,
                null
              >,
            );
          }}
        >
          <option value="30">
            30라운드
          </option>

          <option value="50">
            50라운드
          </option>

          <option value="70">
            70라운드
          </option>

          <option value="UNLIMITED">
            무제한
          </option>
        </select>
      </div>
    </div>
  );
}