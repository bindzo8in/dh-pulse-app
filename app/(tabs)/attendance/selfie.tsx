import BottomCard from "@/components/BottomCard";
import CaptureButton from "@/components/CaptureButton";
import FaceFrame from "@/components/FaceFrame";
import FaceOverlay from "@/components/FaceOverlay";
import { GUIDE_HEIGHT, GUIDE_LEFT, GUIDE_TOP, GUIDE_WIDTH } from "@/constants/face-guide";
import { useSelfieStore } from "@/stores/selfie-store";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
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
} from "react-native-vision-camera";

export default function SelfieScreen() {
    const {
        hasPermission,
        requestPermission,
    } = useCameraPermission();

    if (!hasPermission) {
        return (
            <View style={styles.center}>
                <Text>Camera permission required</Text>

                <TouchableOpacity
                    onPress={requestPermission}
                >
                    <Text>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const cameraRef = useRef<Camera>(null);

    const [capturing, setCapturing] = useState(false);
    const router = useRouter();
    const setUri = useSelfieStore((s) => s.setUri);


    async function capture() {
        if (!cameraRef.current || capturing) return;

        setCapturing(true);

        try {
            const photo = await cameraRef.current?.takePhoto({

            });

            console.log(photo);

            if (!photo) return;

            setUri(`file://${photo.path}`);

            router.back();

        } finally {
            setCapturing(false);
        }
    }

    const device = useCameraDevice("front");
    if (device == null) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
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
                    <BottomCard status="detecting" />

                    <CaptureButton
                        loading={capturing}
                        onPress={capture}
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
        alignSelf: "center"
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