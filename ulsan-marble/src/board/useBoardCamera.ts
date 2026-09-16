import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { BoardTile } from "../types";
import {
  BOARD_GRID_COLUMNS,
  BOARD_GRID_ROWS,
  getTileBoardSide,
  getTileGridPosition,
} from "./layout";

const FOLLOW_SCALE = 1.15;
const OVERVIEW_PADDING = 16;
const UI_INNER_GAP = 12;

type CameraMode = "overview" | "follow";

type Size = {
  width: number;
  height: number;
};

type CameraTransform = {
  x: number;
  y: number;
  scale: number;
};

interface UseBoardCameraOptions {
  activeTile: BoardTile;
  mode: CameraMode;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function useBoardCamera({ activeTile, mode }: UseBoardCameraOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<Size>({
    width: 0,
    height: 0,
  });
  const [boardSize, setBoardSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const measureLayout = useCallback(() => {
    const viewport = viewportRef.current;
    const boardElement = boardRef.current;

    if (!viewport || !boardElement) return;

    setViewportSize({
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    });
    setBoardSize({
      width: boardElement.clientWidth,
      height: boardElement.clientHeight,
    });
  }, []);

  useEffect(() => {
    measureLayout();

    const resizeObserver = new ResizeObserver(measureLayout);

    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (boardRef.current) resizeObserver.observe(boardRef.current);

    window.addEventListener("resize", measureLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureLayout);
    };
  }, [measureLayout]);

  const overviewScale =
    useMemo(
      () => {
        if (
          viewportSize.width === 0 ||
          viewportSize.height === 0 ||
          boardSize.width === 0 ||
          boardSize.height === 0
        ) {
          return 1;
        }

        return Math.min(
          (
            viewportSize.width -
            OVERVIEW_PADDING * 2
          ) / boardSize.width,

          (
            viewportSize.height -
            OVERVIEW_PADDING * 2
          ) / boardSize.height,

          1,
        );
      },
      [
        boardSize.height,
        boardSize.width,
        viewportSize.height,
        viewportSize.width,
      ],
    );


  const uiLayoutStyle =
    useMemo<CSSProperties>(
      () => {
        if (
          viewportSize.width === 0 ||
          viewportSize.height === 0 ||
          boardSize.width === 0 ||
          boardSize.height === 0
        ) {
          return {};
        }

        const scaledBoardWidth =
          boardSize.width *
          overviewScale;

        const scaledBoardHeight =
          boardSize.height *
          overviewScale;

        const boardLeft =
          (
            viewportSize.width -
            scaledBoardWidth
          ) / 2;

        const boardTop =
          (
            viewportSize.height -
            scaledBoardHeight
          ) / 2;

        const boardRight =
          viewportSize.width -
          boardLeft -
          scaledBoardWidth;

        const boardBottom =
          viewportSize.height -
          boardTop -
          scaledBoardHeight;

        const tileWidth =
          scaledBoardWidth /
          BOARD_GRID_COLUMNS;

        const tileHeight =
          scaledBoardHeight /
          BOARD_GRID_ROWS;

        return {
          "--board-visual-left":
            `${boardLeft}px`,

          "--board-visual-right":
            `${boardRight}px`,

          "--board-visual-top":
            `${boardTop}px`,

          "--board-visual-bottom":
            `${boardBottom}px`,

          "--board-tile-width":
            `${tileWidth}px`,

          "--board-tile-height":
            `${tileHeight}px`,

          "--board-inner-left":
            `${
              boardLeft +
              tileWidth +
              UI_INNER_GAP
            }px`,

          "--board-inner-right":
            `${
              boardRight +
              tileWidth +
              UI_INNER_GAP
            }px`,

          "--board-inner-top":
            `${
              boardTop +
              tileHeight +
              UI_INNER_GAP
            }px`,

          "--board-inner-bottom":
            `${
              boardBottom +
              tileHeight +
              UI_INNER_GAP
            }px`,
        } as CSSProperties;
      },
      [
        boardSize.height,
        boardSize.width,
        overviewScale,
        viewportSize.height,
        viewportSize.width,
      ],
    );

  const cameraTransform = useMemo<CameraTransform>(() => {
    if (
      viewportSize.width === 0 ||
      viewportSize.height === 0 ||
      boardSize.width === 0 ||
      boardSize.height === 0
    ) {
      return { x: 0, y: 0, scale: 1 };
    }

    if (mode === "overview") {
      return {
        x: 0,
        y: 0,
        scale: overviewScale,
      };
    }

    const gridPosition = getTileGridPosition(activeTile);
    const tileCenterX =
      ((gridPosition.column - 0.5) / BOARD_GRID_COLUMNS) * boardSize.width;
    const tileCenterY =
      ((gridPosition.row - 0.5) / BOARD_GRID_ROWS) * boardSize.height;
    const activeBoardSide = getTileBoardSide(activeTile);

    const desiredPointBySide: Record<number, { x: number; y: number }> = {
      1: { x: 0.32, y: 0.5 },
      2: { x: 0.5, y: 0.32 },
      3: { x: 0.68, y: 0.5 },
      4: { x: 0.5, y: 0.68 },
    };

    const desiredPoint = desiredPointBySide[activeBoardSide];
    const desiredX = viewportSize.width * desiredPoint.x;
    const desiredY = viewportSize.height * desiredPoint.y;
    const currentX =
      viewportSize.width / 2 +
      (tileCenterX - boardSize.width / 2) * FOLLOW_SCALE;
    const currentY =
      viewportSize.height / 2 +
      (tileCenterY - boardSize.height / 2) * FOLLOW_SCALE;
    const maximumX = Math.max(
      0,
      (boardSize.width * FOLLOW_SCALE - viewportSize.width) / 2,
    );
    const maximumY = Math.max(
      0,
      (boardSize.height * FOLLOW_SCALE - viewportSize.height) / 2,
    );

    return {
      x: clamp(desiredX - currentX, -maximumX, maximumX),
      y: clamp(desiredY - currentY, -maximumY, maximumY),
      scale: FOLLOW_SCALE,
    };
    }, [
      activeTile,
      boardSize,
      mode,
      overviewScale,
      viewportSize,
    ]);

  const cameraPositionStyle: CSSProperties = {
    transform: `translate(-50%, -50%) translate3d(${cameraTransform.x}px, ${cameraTransform.y}px, 0)`,
  };

  const cameraScaleStyle: CSSProperties = {
    transform: `scale(${cameraTransform.scale})`,
  };

  return {
    viewportRef,
    boardRef,

    cameraPositionStyle,
    cameraScaleStyle,

    uiLayoutStyle,
  };
}
