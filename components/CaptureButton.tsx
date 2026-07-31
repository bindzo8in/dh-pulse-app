import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

type Props = {
    loading?: boolean;
    disabled?: boolean;
    onPress: () => void;
};

export default function CaptureButton({
    loading = false,
    onPress,
    disabled
}: Props) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.92);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const handlePress = async () => {
        await Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Medium
        );

        onPress();
    };

    return (
        <Animated.View style={[styles.wrapper, animatedStyle]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.outer}
                 disabled={loading || disabled}
            >
                <Animated.View style={styles.middle}>
                    {loading ? (
                        <ActivityIndicator color="#2563eb" />
                    ) : (
                        <Animated.View style={styles.inner} />
                    )}
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginTop: 20,
    },

    outer: {
        width: 64,
        height: 64,
        borderRadius: 32,

        backgroundColor: "#fff",

        justifyContent: "center",
        alignItems: "center",

        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 15,
    },

    middle: {
        width: 48,
        height: 48,
        borderRadius: 24,

        borderWidth: 2,
        borderColor: "#d1d5db",

        justifyContent: "center",
        alignItems: "center",
    },

    inner: {
        width: 36,
        height: 36,
        borderRadius: 18,

        backgroundColor: "#2563eb",
    },
});