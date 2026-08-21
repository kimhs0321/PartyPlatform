import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { DiceValue } from "../../game/dice";
import "./MiniGameDiceStage.css";

interface MiniGameDiceStageProps {
  values: [DiceValue, DiceValue];
  rolling: boolean;
  label?: string;
  resultLabel?: string;
}

interface DieProps {
  value: DiceValue;
  baseX: number;
  order: "first" | "second";
  rolling: boolean;
}

type FaceDefinition = {
  value: DiceValue;
  position: [number, number, number];
  rotation: [number, number, number];
};

const DIE_SIZE = 0.68;
const DIE_HALF = DIE_SIZE / 2;
const REST_Y = DIE_HALF + 0.045;
export const MINI_GAME_DICE_ROLL_MS = 2_700;
export const MINI_GAME_DICE_SETTLE_MS = 400;
const ROLL_DURATION_SECONDS =
  MINI_GAME_DICE_ROLL_MS / 1_000;
const RESULT_ALIGN_GROUND_PROGRESS = 0.22;
const SECOND_LAUNCH_DELAY_SECONDS = 0.5;
const AIRBORNE_PROGRESS_END = 0.54;
const PIP_RADIUS = 0.041;
const PIP_FACE_OFFSET = 0.002;

const FACE_DEFINITIONS: FaceDefinition[] = [
  {
    value: 1,
    position: [0, 0, DIE_HALF + PIP_FACE_OFFSET],
    rotation: [0, 0, 0],
  },
  {
    value: 6,
    position: [0, 0, -DIE_HALF - PIP_FACE_OFFSET],
    rotation: [0, Math.PI, 0],
  },
  {
    value: 3,
    position: [DIE_HALF + PIP_FACE_OFFSET, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    value: 4,
    position: [-DIE_HALF - PIP_FACE_OFFSET, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    value: 2,
    position: [0, DIE_HALF + PIP_FACE_OFFSET, 0],
    rotation: [-Math.PI / 2, 0, 0],
  },
  {
    value: 5,
    position: [0, -DIE_HALF - PIP_FACE_OFFSET, 0],
    rotation: [Math.PI / 2, 0, 0],
  },
];

const FACE_NORMALS: Record<DiceValue, THREE.Vector3> = {
  1: new THREE.Vector3(0, 0, 1),
  2: new THREE.Vector3(0, 1, 0),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  5: new THREE.Vector3(0, -1, 0),
  6: new THREE.Vector3(0, 0, -1),
};

const PIP_LAYOUTS: Record<DiceValue, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [
    [-0.14, 0.14],
    [0.14, -0.14],
  ],
  3: [
    [-0.145, 0.145],
    [0, 0],
    [0.145, -0.145],
  ],
  4: [
    [-0.14, 0.14],
    [0.14, 0.14],
    [-0.14, -0.14],
    [0.14, -0.14],
  ],
  5: [
    [-0.145, 0.145],
    [0.145, 0.145],
    [0, 0],
    [-0.145, -0.145],
    [0.145, -0.145],
  ],
  6: [
    [-0.145, 0.15],
    [0.145, 0.15],
    [-0.145, 0],
    [0.145, 0],
    [-0.145, -0.15],
    [0.145, -0.15],
  ],
};

function getResultQuaternion(
  value: DiceValue,
  twist: number,
): THREE.Quaternion {
  const alignToTop = new THREE.Quaternion().setFromUnitVectors(
    FACE_NORMALS[value],
    new THREE.Vector3(0, 1, 0),
  );
  const turnAroundTop = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    twist,
  );

  return turnAroundTop.multiply(alignToTop);
}

function PipFace({ face }: { face: FaceDefinition }) {
  return (
    <group position={face.position} rotation={face.rotation}>
      {PIP_LAYOUTS[face.value].map(([x, y], index) => (
        <mesh
          key={`${face.value}-${index}`}
          position={[x, y, 0.001]}
        >
          <circleGeometry args={[PIP_RADIUS, 24]} />
          <meshBasicMaterial
            color="#102633"
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Die({ value, baseX, order, rolling }: DieProps) {
  const groupRef = useRef<THREE.Group>(null);
  const previousRollingRef = useRef(rolling);
  const rollStartRef = useRef(0);
  const initializedRef = useRef(false);
  const resultAlignCapturedRef = useRef(false);
  const resultAlignFromQuaternionRef = useRef(
    new THREE.Quaternion(),
  );
  const targetQuaternionRef = useRef(
    getResultQuaternion(
      value,
      order === "first" ? -0.24 : 0.31,
    ),
  );

  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        DIE_SIZE,
        DIE_SIZE,
        DIE_SIZE,
        5,
        0.075,
      ),
    [],
  );

  useEffect(() => {
    targetQuaternionRef.current = getResultQuaternion(
      value,
      order === "first" ? -0.24 : 0.31,
    );
  }, [order, value]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  useFrame((state, delta) => {
    const die = groupRef.current;
    if (!die) return;

    const elapsed = state.clock.elapsedTime;

    if (!initializedRef.current) {
      initializedRef.current = true;
      rollStartRef.current = elapsed;
      resultAlignCapturedRef.current = false;
      die.quaternion.copy(targetQuaternionRef.current);
    }

    if (rolling && !previousRollingRef.current) {
      rollStartRef.current = elapsed;
      resultAlignCapturedRef.current = false;
    }

    if (rolling) {
      const rollElapsed = elapsed - rollStartRef.current;
      const launchDelay =
        order === "first" ? 0 : SECOND_LAUNCH_DELAY_SECONDS;
      const localElapsed = rollElapsed - launchDelay;

      if (localElapsed <= 0) {
        die.visible = false;
        previousRollingRef.current = rolling;
        return;
      }

      die.visible = true;

      const localDuration =
        ROLL_DURATION_SECONDS - launchDelay;
      const progress = Math.min(
        localElapsed / localDuration,
        1,
      );
      const startX =
        order === "first" ? -4.7 : -4.95;
      const landingX =
        order === "first"
          ? baseX - 0.42
          : baseX - 0.24;
      const startZ =
        order === "first" ? 0.18 : -0.16;
      const landingZ =
        order === "first" ? 0.06 : -0.05;
      const throwHeight =
        order === "first" ? 1.42 : 1.25;

      if (progress < AIRBORNE_PROGRESS_END) {
        const airProgress =
          progress / AIRBORNE_PROGRESS_END;
        const forwardProgress =
          1 - Math.pow(1 - airProgress, 1.35);
        const parabola =
          4 * airProgress * (1 - airProgress);

        die.position.x = THREE.MathUtils.lerp(
          startX,
          landingX,
          forwardProgress,
        );
        die.position.y =
          REST_Y +
          0.08 * (1 - airProgress) +
          throwHeight * parabola;
        die.position.z = THREE.MathUtils.lerp(
          startZ,
          landingZ,
          forwardProgress,
        );

        const direction =
          order === "first" ? 1 : -1;
        const rotationSpeed =
          direction * delta * 10.2;

        die.rotateX(rotationSpeed * 1.1);
        die.rotateY(rotationSpeed * 1.45);
        die.rotateZ(rotationSpeed * 0.68);
      } else {
        const groundProgress =
          (progress - AIRBORNE_PROGRESS_END) /
          (1 - AIRBORNE_PROGRESS_END);
        const groundEase =
          1 - Math.pow(1 - groundProgress, 2.2);
        const bounce =
          Math.abs(
            Math.sin(groundProgress * Math.PI * 3.2),
          ) *
          Math.pow(1 - groundProgress, 2.5) *
          0.22;

        die.position.x = THREE.MathUtils.lerp(
          landingX,
          baseX,
          groundEase,
        );
        die.position.y = REST_Y + bounce;
        die.position.z = THREE.MathUtils.lerp(
          landingZ,
          0,
          groundEase,
        );

        if (
          groundProgress <
          RESULT_ALIGN_GROUND_PROGRESS
        ) {
          const direction =
            order === "first" ? 1 : -1;
          const rollingSpeed =
            direction *
            delta *
            7.2 *
            Math.pow(1 - groundProgress, 1.35);

          die.rotateX(rollingSpeed * 1.12);
          die.rotateY(rollingSpeed * 0.84);
          die.rotateZ(rollingSpeed * 0.42);
        } else {
          if (!resultAlignCapturedRef.current) {
            resultAlignCapturedRef.current = true;
            resultAlignFromQuaternionRef.current.copy(
              die.quaternion,
            );
          }

          const alignProgress = Math.min(
            (groundProgress -
              RESULT_ALIGN_GROUND_PROGRESS) /
              (1 - RESULT_ALIGN_GROUND_PROGRESS),
            1,
          );
          const alignEase =
            alignProgress *
            alignProgress *
            (3 - 2 * alignProgress);

          die.quaternion.slerpQuaternions(
            resultAlignFromQuaternionRef.current,
            targetQuaternionRef.current,
            alignEase,
          );
        }

        if (progress >= 1) {
          die.position.set(baseX, REST_Y, 0);
          die.quaternion.copy(
            targetQuaternionRef.current,
          );
        }
      }
    } else {
      die.visible = true;
      die.position.set(baseX, REST_Y, 0);
      die.quaternion.copy(targetQuaternionRef.current);
    }

    previousRollingRef.current = rolling;
  });

  return (
    <group ref={groupRef} position={[baseX, REST_Y, 0]}>
      <mesh castShadow receiveShadow geometry={geometry}>
        <meshStandardMaterial
          color="#f7fbfd"
          roughness={0.34}
          metalness={0.03}
        />
      </mesh>

      {FACE_DEFINITIONS.map((face) => (
        <PipFace key={face.value} face={face} />
      ))}
    </group>
  );
}

function DiceScene({
  rolling,
  values,
}: {
  rolling: boolean;
  values: [DiceValue, DiceValue];
}) {
  return (
    <>
      <ambientLight intensity={1.5} />

      <directionalLight
        castShadow
        position={[4.5, 7, 5]}
        intensity={3.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={18}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
      />

      <pointLight
        position={[-4, 3.5, 3]}
        intensity={13}
        distance={13}
        color="#9bdcff"
      />

      <Die
        value={values[0]}
        baseX={0.58}
        order="first"
        rolling={rolling}
      />
      <Die
        value={values[1]}
        baseX={-0.58}
        order="second"
        rolling={rolling}
      />

      <mesh
        receiveShadow
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[12, 8]} />
        <shadowMaterial transparent opacity={0.34} />
      </mesh>
    </>
  );
}

export function MiniGameDiceStage({
  values,
  rolling,
  label = "주사위 결과",
  resultLabel,
}: MiniGameDiceStageProps) {
  const total = values[0] + values[1];

  return (
    <div
      className={`minigame-dice-stage${
        rolling ? " is-rolling" : " is-settled"
      }`}
      aria-live="polite"
      aria-label={
        rolling
          ? "주사위를 굴리는 중"
          : `${label} ${values[0]}, ${values[1]}, 합계 ${total}`
      }
    >
      <div className="minigame-dice-stage__canvas">
        <Canvas
          shadows
          dpr={[1, 1.6]}
          camera={{
            position: [0, 5.2, 8.5],
            fov: 35,
            near: 0.1,
            far: 40,
          }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <DiceScene rolling={rolling} values={values} />
        </Canvas>
      </div>

      <div className="minigame-dice-stage__readout">
        {rolling ? (
          <strong>주사위 투척 중</strong>
        ) : (
          <>
            <span>{resultLabel ?? label}</span>
            <div>
              <b>{values[0]}</b>
              <em>+</em>
              <b>{values[1]}</b>
              <em>=</em>
              <strong>{total}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
