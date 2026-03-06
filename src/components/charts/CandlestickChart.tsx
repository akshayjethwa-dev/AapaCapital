import React from 'react';
import { View, Dimensions, Text } from 'react-native'; // Added Text import
import { LineChart } from 'react-native-gifted-charts'; // Changed to LineChart
import { Colors } from '../../../src/theme/colors'; 

const { width } = Dimensions.get('window');

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp?: string;
}

interface ChartProps {
  data: CandleData[];
}

export const CandlestickChart = ({ data }: ChartProps) => {
  // react-native-gifted-charts expects a 'value' property for its LineChart
  const chartData = data.map((item) => ({
    value: item.close,
    label: item.timestamp,
  }));

  return (
    <View className="flex-1 justify-center items-center w-full">
      <LineChart
        data={chartData}
        width={width - 32} // padding adjustments
        height={300}
        color={Colors.trend.positive} // Use a line color from your theme
        thickness={2}
        // Grid & Axis Styling
        yAxisThickness={0}
        xAxisThickness={0}
        hideRules={false}
        rulesColor={Colors.surfaceLight} // zinc-800
        rulesType="dashed"
        yAxisTextStyle={{ color: Colors.text.muted, fontSize: 10, fontWeight: 'bold' }}
        xAxisLabelTextStyle={{ color: Colors.text.muted, fontSize: 10 }}
        // Interaction
        pointerConfig={{
          pointerStripColor: Colors.text.secondary,
          pointerStripWidth: 1,
          strokeDashArray: [2, 5],
          pointerColor: Colors.text.primary,
          radius: 4,
          pointerLabelWidth: 80,
          pointerLabelHeight: 30,
          pointerLabelComponent: (items: any) => {
            // Line chart items use 'value' instead of 'close'
            const val = items[0]?.value?.toFixed(2);
            return (
              <View className="bg-zinc-800 px-2 py-1 rounded shadow-lg items-center justify-center">
                <Text className="text-white text-[10px] font-black">{val}</Text>
              </View>
            );
          },
        }}
      />
    </View>
  );
};