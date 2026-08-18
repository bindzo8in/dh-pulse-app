import BottomCard from "@/components/BottomCard";
import CaptureButton from "@/components/CaptureButton";
import FaceFrame from "@/components/FaceFrame";
import FaceOverlay from "@/components/FaceOverlay";
import { GUIDE_HEIGHT, GUIDE_TOP, GUIDE_WIDTH } from "@/constants/face-guide";
import { useSelfieStore } from "@/stores/selfie-store";
import { Stack, useRouter } from "expo-router";
import { useRef, useState, useEffect } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useFrameProcessor,
} from "react-native-vision-camera";

import {
    useFaceDetector,
} from "react-native-vision-camera-face-detector";

import { Worklets } from "react-native-worklets-core";

export default function SelfieScreen() {
    const {
        hasPermission,
        requestPermission,
    } = useCameraPermission();

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    const device = useCameraDevice("front");

    const { detectFaces } = useFaceDetector({
        performanceMode: "fast",
        landmarkMode: "all",
        contourMode: "none",
        classificationMode: "all",
    });

    const cameraRef = useRef<Camera>(null);
    const [capturing, setCapturing] = useState(false);
    const [hasOneFace, setHasOneFace] = useState(false);
    const lastHasOneFaceRef = useRef(false);
    const router = useRouter();
    const setUri = useSelfieStore((s) => s.setUri);

    async function capture() {
        if (!cameraRef.current || capturing) return;
        setCapturing(true);
        try {
            const photo = await cameraRef.current?.takePhoto({});
            if (!photo) return;
            setUri(`file://${photo.path}`);
            router.back();
        } catch (e) {
            console.error("Capture Error", e);
        } finally {
            setCapturing(false);
        }
    }

    const updateHasOneFace = Worklets.createRunOnJS((count: number) => {
        const isOne = count === 1;
        if (isOne !== lastHasOneFaceRef.current) {
            lastHasOneFaceRef.current = isOne;
            setHasOneFace(isOne);
        }
    });

    const frameProcessor = useFrameProcessor(
        (frame) => {
            "worklet";
            const detected = detectFaces(frame);
            updateHasOneFace(detected.length);
        },
        [detectFaces]
    );

    if (!hasPermission) {
        return (
            <View style={styles.center}>
                <Text style={styles.permissionTitle}>Camera permission required</Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (device == null) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10 }}>Finding Camera...</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <View style={styles.container}>
                <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive
                    photo
                    frameProcessor={frameProcessor}
                />

                <View
                    style={{
                        position: "absolute",
                        top: GUIDE_TOP,
                        width: GUIDE_WIDTH,
                        height: GUIDE_HEIGHT,
                        alignSelf: "center",
                    }}
                >
                    <FaceOverlay />
                    <FaceFrame />
                </View>

                <View style={styles.bottomSection}>
                    <BottomCard
                        status={
                            capturing
                                ? "capturing"
                                : hasOneFace
                                ? "ready"
                                : "detecting"
                        }
                    />

                    <CaptureButton
                        loading={capturing}
                        onPress={capture}
                        disabled={!hasOneFace}
                    />
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    bottomSection: {
        position: "absolute",
        left: 20,
        right: 20,
        bottom: 24,
        alignItems: "center",
    },
    faceFrameContainer: {
        position: "absolute",
        alignSelf: "center",
    },
    container: {
        flex: 1,
        backgroundColor: "#000",
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    permissionTitle: {
        color: "#000",
        fontSize: 20,
        marginBottom: 20,
        fontWeight: "700",
    },

    permissionButton: {
        backgroundColor: "#2563eb",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
    },
});