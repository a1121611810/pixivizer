declare module "postcss-pxtorem" {
  const postcssPxToRem: (options?: {
    rootValue?: number;
    propList?: string[];
    minPixelValue?: number;
  }) => any;
  export default postcssPxToRem;
}
