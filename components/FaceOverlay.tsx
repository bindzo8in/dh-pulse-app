import React from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Defs, Mask, Rect, Ellipse } from "react-native-svg";

import {
    GUIDE_HEIGHT,
    GUIDE_TOP,
    GUIDE_WIDTH,
} from "@/constants/face-guide";

export default function FaceOverlay() {
    const { width } = useWindowDimensions();

    const cx = width / 2;
    const cy = GUIDE_TOP + GUIDE_HEIGHT / 2;

    return (
        <Svg
            width="100%"
            height="100%"
            style={{ position: "absolute" }}
        >
            <Defs>
                <Mask id="faceMask">
                    <Rect width="100%" height="100%" fill="white" />

                    <Ellipse
                        cx={GUIDE_WIDTH / 2}
                        cy={GUIDE_HEIGHT / 2}
                        rx={GUIDE_WIDTH / 2 - 2}
                        ry={GUIDE_HEIGHT / 2 - 2}
                        fill="black"
                    />
                </Mask>
            </Defs>

            <Rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.65)"
                mask="url(#faceMask)"
            />
        </Svg>
    );
}