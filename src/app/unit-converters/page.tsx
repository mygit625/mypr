
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Scale } from 'lucide-react';
import { categories, type Category, type Unit } from './conversions';
import { Label } from '@/components/ui/label';

export default function UnitConvertersPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(Object.keys(categories)[0]);
  const [fromUnit, setFromUnit] = useState<string>(Object.keys(categories[Object.keys(categories)[0]].units)[0]);
  const [toUnit, setToUnit] = useState<string>(Object.keys(categories[Object.keys(categories)[0]].units)[1] || Object.keys(categories[Object.keys(categories)[0]].units)[0]);

  const [inputValue, setInputValue] = useState<string>('1');
  const [outputValue, setOutputValue] = useState<string>('');

  const currentCategory = categories[selectedCategory];

  useEffect(() => {
    // Reset units when category changes
    const newCategory = categories[selectedCategory];
    const unitKeys = Object.keys(newCategory.units);
    setFromUnit(unitKeys[0]);
    setToUnit(unitKeys[1] || unitKeys[0]);
    setInputValue('1');
  }, [selectedCategory]);

  useEffect(() => {
    const convert = () => {
      const value = parseFloat(inputValue);
      if (isNaN(value) || !currentCategory) {
        setOutputValue('');
        return;
      }

      let result: number;
      if (currentCategory.type === 'factor') {
        const fromFactor = currentCategory.units[fromUnit]?.factor;
        const toFactor = currentCategory.units[toUnit]?.factor;
        if (fromFactor === undefined || toFactor === undefined) {
             setOutputValue(''); return;
        }
        const baseValue = value * fromFactor;
        result = baseValue / toFactor;
      } else { // 'function' based
        result = currentCategory.conversion(value, fromUnit, toUnit);
      }
      
      setOutputValue(result.toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false }));
    };

    convert();
  }, [inputValue, fromUnit, toUnit, selectedCategory]);

  const handleSwap = () => {
    const tempFrom = fromUnit;
    setFromUnit(toUnit);
    setToUnit(tempFrom);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow empty, numbers, decimal point, and negative sign
    if (/^-?\d*\.?\d*$/.test(rawValue)) {
      setInputValue(rawValue);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <header className="text-center mb-8">
        <Scale className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">Unit Converter</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
          Quickly and accurately convert between various units of measurement. Select a category to get started.
        </p>
      </header>

      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Select Conversion Type</CardTitle>
          <CardDescription>Choose a category like Length, Weight, or Temperature.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full text-base py-6">
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(categories).map((cat) => (
                <SelectItem key={cat} value={cat} className="text-base">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="from-unit">From</Label>
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger id="from-unit">
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(currentCategory.units).map(([key, unit]) => (
                    <SelectItem key={key} value={key}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwap}
              className="hidden md:flex justify-center"
              aria-label="Swap units"
            >
              <ArrowRightLeft className="h-5 w-5" />
            </Button>

            <div className="space-y-2">
              <Label htmlFor="to-unit">To</Label>
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger id="to-unit">
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(currentCategory.units).map(([key, unit]) => (
                    <SelectItem key={key} value={key}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
              variant="outline"
              size="default"
              onClick={handleSwap}
              className="flex md:hidden w-full"
              aria-label="Swap units"
            >
              <ArrowRightLeft className="h-5 w-5 mr-2" /> Swap Units
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <Label htmlFor="input-value">Value to Convert</Label>
              <Input
                id="input-value"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                className="text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-value">Result</Label>
              <Input
                id="output-value"
                type="text"
                value={outputValue}
                readOnly
                className="text-lg h-12 bg-muted/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
