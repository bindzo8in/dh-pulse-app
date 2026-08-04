import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  status?: "ready" | "detecting" | "capturing";
};

export default function BottomCard({
  status = "detecting",
}: Props) {
  const statusColor =
    status === "ready"
      ? "#22c55e"
      : status === "capturing"
      ? "#f59e0b"
      : "#38bdf8";

  const statusText =
    status === "ready"
      ? "Face Detected"
      : status === "capturing"
      ? "Capturing..."
      : "Detecting Face";

  return (
    <View style={styles.container}>
      <BlurView
        intensity={60}
        tint="dark"
        style={styles.card}
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusColor,
              },
            ]}
          />

          <Text style={styles.status}>
            {statusText}
          </Text>
        </View>

        <Text style={styles.title}>
          Selfie Verification
        </Text>

        <Text style={styles.subtitle}>
          Place your face inside the guide.
        </Text>

        <View style={styles.item}>
          <MaterialIcons
            name="check-circle"
            color="#22c55e"
            size={20}
          />

          <Text style={styles.itemText}>
            Face fully visible
          </Text>
        </View>

        <View style={styles.item}>
          <MaterialIcons
            name="check-circle"
            color="#22c55e"
            size={20}
          />

          <Text style={styles.itemText}>
            Good lighting
          </Text>
        </View>

        <View style={styles.item}>
          <MaterialIcons
            name="check-circle"
            color="#22c55e"
            size={20}
          />

          <Text style={styles.itemText}>
            Remove mask or sunglasses
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
   width: "100%"
  },

  card: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 20,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,.15)",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },

  status: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 24,
  },

  subtitle: {
    color: "#ddd",
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 22,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  itemText: {
    color: "#ddd",
    marginLeft: 12,
    fontSize: 15,
  },
});