export interface Unit {
  name: string;
  factor: number;
}

export interface FactorBasedCategory {
  type: 'factor';
  baseUnit: string;
  units: Record<string, Unit>;
}

export interface FunctionBasedCategory {
    type: 'function';
    units: Record<string, { name: string }>;
    conversion: (value: number, from: string, to: string) => number;
}

export type Category = FactorBasedCategory | FunctionBasedCategory;

export const categories: Record<string, Category> = {
  Length: {
    type: 'factor',
    baseUnit: 'meter',
    units: {
      meter: { name: 'Meter', factor: 1 },
      kilometer: { name: 'Kilometer', factor: 1000 },
      centimeter: { name: 'Centimeter', factor: 0.01 },
      millimeter: { name: 'Millimeter', factor: 0.001 },
      mile: { name: 'Mile', factor: 1609.34 },
      yard: { name: 'Yard', factor: 0.9144 },
      foot: { name: 'Foot', factor: 0.3048 },
      inch: { name: 'Inch', factor: 0.0254 },
    },
  },
  Weight: {
    type: 'factor',
    baseUnit: 'kilogram',
    units: {
      kilogram: { name: 'Kilogram', factor: 1 },
      gram: { name: 'Gram', factor: 0.001 },
      milligram: { name: 'Milligram', factor: 1e-6 },
      tonne: { name: 'Tonne', factor: 1000 },
      pound: { name: 'Pound', factor: 0.453592 },
      ounce: { name: 'Ounce', factor: 0.0283495 },
    },
  },
  Temperature: {
    type: 'function',
    units: {
        celsius: { name: 'Celsius' },
        fahrenheit: { name: 'Fahrenheit' },
        kelvin: { name: 'Kelvin' },
    },
    conversion: (value, from, to) => {
        if (from === to) return value;
        // Convert input to Celsius first
        let celsiusValue: number;
        switch (from) {
            case 'fahrenheit':
                celsiusValue = (value - 32) * 5/9;
                break;
            case 'kelvin':
                celsiusValue = value - 273.15;
                break;
            default: // from is 'celsius'
                celsiusValue = value;
                break;
        }

        // Convert from Celsius to target unit
        switch (to) {
            case 'fahrenheit':
                return (celsiusValue * 9/5) + 32;
            case 'kelvin':
                return celsiusValue + 273.15;
            default: // to is 'celsius'
                return celsiusValue;
        }
    }
  },
  Area: {
    type: 'factor',
    baseUnit: 'square_meter',
    units: {
      square_meter: { name: 'Square Meter', factor: 1 },
      square_kilometer: { name: 'Square Kilometer', factor: 1e6 },
      square_mile: { name: 'Square Mile', factor: 2.59e6 },
      hectare: { name: 'Hectare', factor: 10000 },
      acre: { name: 'Acre', factor: 4046.86 },
    },
  },
  Volume: {
    type: 'factor',
    baseUnit: 'liter',
    units: {
      liter: { name: 'Liter', factor: 1 },
      milliliter: { name: 'Milliliter', factor: 0.001 },
      cubic_meter: { name: 'Cubic Meter', factor: 1000 },
      gallon: { name: 'Gallon (US)', factor: 3.78541 },
      quart: { name: 'Quart (US)', factor: 0.946353 },
    },
  },
};
