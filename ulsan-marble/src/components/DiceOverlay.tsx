import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { DiceValue } from "../game/dice";
import "./DiceOverlay.css";

interface DiceOverlayProps {
  visible: boolean;
  animating: boolean;
  values: [DiceValue, DiceValue];
}

interface DieProps {
  value: DiceValue;
  baseX: number;
  order: "first" | "second";
  animating: boolean;
}

type FaceDefinition = {
  value: DiceValue;
  position: [number, number, number];
  rotation: [number, number, number];
};

const DIE_SIZE = 0.62;
const DIE_HALF = DIE_SIZE / 2;
const REST_Y = DIE_HALF + 0.045;
const ROLL_DURATION_SECONDS = 2.25;
const RESULT_ALIGN_GROUND_PROGRESS = 0.22;
const SECOND_LAUNCH_DELAY_SECONDS = 0.5;
const AIRBORNE_PROGRESS_END = 0.54;
const PIP_RADIUS = 0.038;
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

function getResultQuaternion(value: DiceValue, twist: number): THREE.Quaternion {
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

function Die({ value, baseX, order, animating }: DieProps) {
  const groupRef = useRef<THREE.Group>(null);
  const previousAnimatingRef = useRef(animating);
  const rollStartRef = useRef(0);
  const initializedRef = useRef(false);
  const resultAlignCapturedRef = useRef(false);
  const resultAlignFromQuaternionRef = useRef(
    new THREE.Quaternion(),
  );

  const targetQuaternionRef = useRef(
    getResultQuaternion(value, order === "first" ? -0.24 : 0.31),
  );

  const geometry = useMemo(
    () => new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 5, 0.075),
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

    if (animating && !previousAnimatingRef.current) {
      rollStartRef.current = elapsed;
      resultAlignCapturedRef.current = false;
    }

    if (animating) {
      const rollElapsed = elapsed - rollStartRef.current;
      const launchDelay =
        order === "first" ? 0 : SECOND_LAUNCH_DELAY_SECONDS;
      const localElapsed = rollElapsed - launchDelay;

      if (localElapsed <= 0) {
        die.visible = false;
        previousAnimatingRef.current = animating;
        return;
      }

      die.visible = true;

      const localDuration =
        ROLL_DURATION_SECONDS - launchDelay;
      const progress = Math.min(
        localElapsed / localDuration,
        1,
      );

      /*
       * 두 주사위 모두 왼쪽에서 날아온다.
       * 첫 번째는 오른쪽 자리까지 먼저 통과하고,
       * 두 번째는 0.5초 뒤 왼쪽 자리에 착지한다.
       */
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

        /*
         * 수평 이동은 빠르게 전진하고,
         * 높이는 4t(1-t) 포물선으로 처리한다.
         * 기존처럼 전체 시간 동안 떠 있지 않는다.
         */
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

        /*
         * 착지 후에는 높이가 큰 호를 그리지 않고,
         * 감쇠되는 짧은 바운스와 전진 굴림만 남긴다.
         */
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
          /*
           * 첫 착지 직후에는 관성대로 조금 더 구른다.
           */
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
          /*
           * 아직 바닥에서 굴러가는 동안 현재 자세를 한 번 저장하고,
           * 남은 구름 구간 안에서 결과 면으로 감속하며 수렴한다.
           * animating 종료 뒤에 별도의 회전은 발생하지 않는다.
           */
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
      /*
       * 결과 면은 이미 착지 과정에서 결정됐다.
       * 여기서는 추가 회전 없이 정확한 정지 상태만 유지한다.
       */
      die.visible = true;
      die.position.set(baseX, REST_Y, 0);
      die.quaternion.copy(
        targetQuaternionRef.current,
      );
    }

    previousAnimatingRef.current = animating;
  });

  return (
    <group ref={groupRef} position={[baseX, REST_Y, 0]}>
      <mesh castShadow receiveShadow geometry={geometry}>
        <meshStandardMaterial color="#f7fbfd" roughness={0.34} metalness={0.03} />
      </mesh>

      {FACE_DEFINITIONS.map((face) => (
        <PipFace key={face.value} face={face} />
      ))}
    </group>
  );
}

function DiceScene({
  animating,
  values,
}: {
  animating: boolean;
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

      <Die value={values[0]} baseX={0.58} order="first" animating={animating} />
      <Die value={values[1]} baseX={-0.58} order="second" animating={animating} />

      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <shadowMaterial transparent opacity={0.34} />
      </mesh>
    </>
  );
}

export function DiceOverlay({ visible, animating, values }: DiceOverlayProps) {
  if (!visible) return null;

  const total = values[0] + values[1];
  const isDouble = !animating && values[0] === values[1];

  return (
    <div
      className={`dice-overlay${isDouble ? " dice-overlay--double" : ""}`}
      aria-live="polite"
      aria-label={
        animating
          ? "주사위를 굴리는 중"
          : `주사위 결과 ${values[0]}, ${values[1]}, 합계 ${total}`
      }
    >
      <div className="dice-overlay__canvas">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [0, 5.4, 8.8], fov: 36, near: 0.1, far: 40 }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <DiceScene animating={animating} values={values} />
        </Canvas>
      </div>

      <div
        className={`dice-result-panel${
          animating
            ? " dice-result-panel--rolling"
            : " dice-result-panel--settled"
        }`}
      >
        {animating ? (
          <strong className="dice-result-panel__rolling">
            주사위 굴리는 중...
          </strong>
        ) : (
          <>
            <span className="dice-result-panel__label">
              {isDouble ? "더블!" : "주사위 결과"}
            </span>

            <div className="dice-result-panel__equation">
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
