import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AirportFlightState } from "../../game/airport/airportTypes";
import type { PlayerTokenData } from "../PlayerToken";
import "./AirportFlight.css";

interface AirportFlightProps {
  flight: AirportFlightState | null;
  player: PlayerTokenData | null;
  onComplete: () => void;
}

interface FlightPoint {
  x: number;
  y: number;
}

interface FlightPath {
  start: FlightPoint;
  control: FlightPoint;
  end: FlightPoint;
}

function quadraticPoint(
  start: FlightPoint,
  control: FlightPoint,
  end: FlightPoint,
  progress: number,
): FlightPoint {
  const inverse = 1 - progress;

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * progress * control.x +
      progress * progress * end.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * progress * control.y +
      progress * progress * end.y,
  };
}

function quadraticAngle(
  start: FlightPoint,
  control: FlightPoint,
  end: FlightPoint,
  progress: number,
): number {
  const dx =
    2 * (1 - progress) * (control.x - start.x) +
    2 * progress * (end.x - control.x);
  const dy =
    2 * (1 - progress) * (control.y - start.y) +
    2 * progress * (end.y - control.y);

  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function getOpacity(progress: number): number {
  if (progress < 0.08) return progress / 0.08;
  if (progress > 0.92) return (1 - progress) / 0.08;
  return 1;
}

export function AirportFlight({
  flight,
  player,
  onComplete,
}: AirportFlightProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [path, setPath] = useState<FlightPath | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    completedRef.current = false;
    setPath(null);

    if (!flight || !layerRef.current) return;

    const board = layerRef.current.closest(".ulsan-board");
    if (!(board instanceof HTMLElement)) return;

    const startTile = board.querySelector<HTMLElement>(
      `[data-tile-id="${flight.fromPosition}"]`,
    );
    const destinationTile = board.querySelector<HTMLElement>(
      `[data-tile-id="${flight.destinationPosition}"]`,
    );

    if (!startTile || !destinationTile) {
      console.warn("[AirportFlight] 출발지 또는 목적지 타일을 찾지 못했습니다.", {
        fromPosition: flight.fromPosition,
        destinationPosition: flight.destinationPosition,
      });
      return;
    }

    const start: FlightPoint = {
      x: startTile.offsetLeft + startTile.offsetWidth / 2,
      y: startTile.offsetTop + startTile.offsetHeight / 2,
    };
    const end: FlightPoint = {
      x: destinationTile.offsetLeft + destinationTile.offsetWidth / 2,
      y: destinationTile.offsetTop + destinationTile.offsetHeight / 2,
    };

    const boardCenter: FlightPoint = {
      x: board.clientWidth / 2,
      y: board.clientHeight / 2,
    };
    const midpoint: FlightPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const lift = Math.min(190, Math.max(90, distance * 0.15));

    setPath({
      start,
      control: {
        x: boardCenter.x + (midpoint.x - boardCenter.x) * 0.18,
        y: boardCenter.y + (midpoint.y - boardCenter.y) * 0.18 - lift,
      },
      end,
    });
  }, [flight]);

  useEffect(() => {
    if (!flight || !player || !path || !planeRef.current) return;

    const plane = planeRef.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const duration = reducedMotion ? 1200 : 2850;
    const delay = reducedMotion ? 80 : 180;
    let animationFrameId = 0;
    let startTime: number | null = null;

    const renderFrame = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp + delay;
      }

      const elapsed = Math.max(0, timestamp - startTime);
      const rawProgress = Math.min(elapsed / duration, 1);
      const progress = easeInOutCubic(rawProgress);
      const point = quadraticPoint(
        path.start,
        path.control,
        path.end,
        progress,
      );
      const angle = quadraticAngle(
        path.start,
        path.control,
        path.end,
        progress,
      );
      const scale = 0.68 + Math.sin(Math.PI * rawProgress) * 0.42;
      const opacity = getOpacity(rawProgress);

      plane.style.transform =
        `translate3d(${point.x}px, ${point.y}px, 0) ` +
        `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;
      plane.style.opacity = String(opacity);

      if (rawProgress < 1) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    plane.style.opacity = "0";
    plane.style.transform =
      `translate3d(${path.start.x}px, ${path.start.y}px, 0) ` +
      "translate(-50%, -50%) scale(0.68)";

    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [flight?.id, path, player]);

  if (!flight || !player) return null;

  return (
    <div
      ref={layerRef}
      className="airport-flight-layer"
      aria-live="polite"
      aria-label={`${player.name}이 울산공항에서 ${flight.destinationName}(으)로 이동 중`}
    >
      <div ref={planeRef} className="airport-flight-plane">
        <span className="airport-flight-plane__trail" aria-hidden="true" />
        <span className="airport-flight-plane__icon" aria-hidden="true">
          ✈
        </span>
        <span
          className="airport-flight-plane__passenger"
          style={{ ["--airport-passenger-color" as string]: player.color }}
        >
          {player.shortName}
        </span>
      </div>

      <div className="airport-flight-status">
        <span>ULSAN AIR</span>
        <strong>{flight.destinationName}행 비행 중</strong>
      </div>
    </div>
  );
}
