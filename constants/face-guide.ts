import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const GUIDE_WIDTH = width * 0.68;
export const GUIDE_HEIGHT = GUIDE_WIDTH * 1.28;

export const GUIDE_LEFT = (width - GUIDE_WIDTH) / 2;
export const GUIDE_TOP = height * 0.16;