import React from 'react';
import { View, Dimensions } from 'react-native';
import { CartesianChart } from 'react-native-gifted-charts'; // Note: gifted-charts exports multiple chart types, we'll use LineChart for simplicity in this example or the generic chart if candlestick is needed. 
// Actually, gifted-charts has a specific Candlestick chart. Let's use it.
import { CandlestickChart as GFCandlestickChart } from 'react-native-gifted-charts';
import { Colors } from '../../theme/colors';

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
  return (
    <View className="flex-1 justify-center items-center w-full">
      <GFCandlestickChart
        data={data}
        width={width - 32} // padding adjustments
        height={300}
        // Colors from our theme
        positiveColor={Colors.trend.positive}
        negativeColor={Colors.trend.negative}
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
            const val = items[0]?.close?.toFixed(2);
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