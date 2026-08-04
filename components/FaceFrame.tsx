import React, { useEffect } from "react";
import Svg, {
  Ellipse,
  Line,
  Path,
} from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import {
  GUIDE_WIDTH,
  GUIDE_HEIGHT,
} from "@/constants/face-guide";

const AnimatedLine = Animated.createAnimatedComponent(Line);

const STROKE = 4;
const CORNER = 34;

export default function FaceFrame() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2500 }),
      -1,
      false
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    y1: interpolate(
      progress.value,
      [0, 1],
      [8, GUIDE_HEIGHT - 8]
    ),
    y2: interpolate(
      progress.value,
      [0, 1],
      [8, GUIDE_HEIGHT - 8]
    ),
  }));

  return (
    <Svg
      width={GUIDE_WIDTH}
      height={GUIDE_HEIGHT}
    >
      {/* Border */}
      <Ellipse
        cx={GUIDE_WIDTH / 2}
        cy={GUIDE_HEIGHT / 2}
        rx={GUIDE_WIDTH / 2 - 2}
        ry={GUIDE_HEIGHT / 2 - 2}
        stroke="rgba(255,255,255,.2)"
        strokeWidth={2}
        fill="none"
      />

      {/* Scanner */}
      <AnimatedLine
        animatedProps={animatedProps}
        x1={CORNER}
        x2={GUIDE_WIDTH - CORNER}
        stroke="#22c55e"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Top Left */}
      <Path
        d={`M0 ${CORNER} V0 H${CORNER}`}
        stroke="#22c55e"
        strokeWidth={STROKE}
        fill="none"
      />

      {/* Top Right */}
      <Path
        d={`M${GUIDE_WIDTH - CORNER} 0 H${GUIDE_WIDTH} V${CORNER}`}
        stroke="#22c55e"
        strokeWidth={STROKE}
        fill="none"
      />

      {/* Bottom Left */}
      <Path
        d={`M0 ${GUIDE_HEIGHT - CORNER} V${GUIDE_HEIGHT} H${CORNER}`}
        stroke="#22c55e"
        strokeWidth={STROKE}
        fill="none"
      />

      {/* Bottom Right */}
      <Path
        d={`M${GUIDE_WIDTH - CORNER} ${GUIDE_HEIGHT} H${GUIDE_WIDTH} V${GUIDE_HEIGHT - CORNER}`}
        stroke="#22c55e"
        strokeWidth={STROKE}
        fill="none"
      />
    </Svg>
  );
}