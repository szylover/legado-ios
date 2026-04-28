// ReadConfig.ts — reading interface configuration

export const PageAnimType = {
  COVER: 0,
  SIMULATION: 1,
  SLIDE: 2,
  SCROLL: 3,
  NONE: 4,
} as const;

export type PageAnimTypeValue = (typeof PageAnimType)[keyof typeof PageAnimType];

export interface ReadConfig {
  id: number;
  name: string;
  bgStr?: string;
  bgStrNight?: string;
  /** 0=颜色 1=图片 2=渐变 */
  bgType: number;
  bgTypeNight: number;
  textColor: string;
  textColorNight: string;
  textSize: number;
  letterSpacing: number;
  lineSpacingExtra: number;
  paraSpacing: number;
  fontPath?: string;
  fontName?: string;
  paddingLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  pageAnim: PageAnimTypeValue;
  titleSize: number;
  /** 0=左对齐 1=居中 2=两端对齐 */
  titleAlign: number;
  indent: number;
}

export const DEFAULT_READ_CONFIG: ReadConfig = {
  id: 1,
  name: '默认',
  bgStr: '#FFF8F0',
  bgStrNight: '#1A1A1A',
  bgType: 0,
  bgTypeNight: 0,
  textColor: '#333333',
  textColorNight: '#AAAAAA',
  textSize: 18,
  letterSpacing: 0,
  lineSpacingExtra: 12,
  paraSpacing: 16,
  paddingLeft: 16,
  paddingTop: 16,
  paddingRight: 16,
  paddingBottom: 32,
  pageAnim: PageAnimType.SLIDE,
  titleSize: 20,
  titleAlign: 1,
  indent: 2,
};
