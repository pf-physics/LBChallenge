import React from 'react';

export type RGB = {
  red: number;
  green: number;
  blue: number;
}

export type GameInfo = {
  userId: string;
  maxMoves: number;
  width: number;
  height: number;
  target: number[];
}

export abstract class ColorHold {
  rgb: RGB

  getLabel = () : string => {
    return this.rgb.red.toFixed(0) + ", " + this.rgb.green.toFixed(0) + ", " + this.rgb.blue.toFixed(0)
  }

  getCss = () : string => {
    return "rgb(" + this.rgb.red + ", " + this.rgb.green + ", " + this.rgb.blue + ")"
  }

  setColors = (rgb: RGB) => {
    this.rgb = rgb
  }

  constructor(rgb?: RGB) {
    this.rgb = rgb ? rgb : { red: 0, green: 0, blue: 0}
  }
}

export class Blank extends ColorHold {}

export class Tile extends ColorHold {
  isClosest: boolean = false;
}

export class Source extends ColorHold {
  row: number;
  col: number;

  constructor(row: number, col: number, rgb?: RGB ) {
    super(rgb)
    this.row = row;
    this.col = col;

  }
}