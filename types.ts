export type ToolType = 'pencil' | 'brush' | 'marker' | 'crayon';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  tool: ToolType;
  color: string;
  points: Point[];
  size: number;
}

export interface CardElement {
  id: string;
  type: 'sticker' | 'text' | 'scrap' | 'path';
  content: string; 
  x: number;
  y: number;
  rotation: number;
  scale: number;
  width?: number;  // New: explicit width for text/containers
  height?: number; // New: explicit height for text/containers
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  pathData?: DrawingPath; 
}

export interface PageState {
  elements: CardElement[];
}

export interface CardState {
  pages: {
    front: PageState;
    insideLeft: PageState;
    insideRight: PageState;
    back: PageState;
  };
  bin: CardElement[];
}

export type PageID = keyof CardState['pages'];

export const ASSETS = {
  scraps: [
    { src: 'https://image2url.com/r2/default/images/1771134177548-22bdfeb0-002a-4c58-b401-1fe273cd6e56.png', label: 'Pink paper' },
    { src: 'https://image2url.com/r2/default/images/1771134231552-8da4a485-748e-4987-89a6-c7c1b99ff5b5.png', label: 'Beige paper' },
    { src: 'https://image2url.com/r2/default/images/1771134283140-a4061d5b-f651-4e05-8e36-f7c051f12563.png', label: 'Recycled paper' },
    { src: 'https://image2url.com/r2/default/images/1771134319596-d2913a39-1f54-46d5-9473-e4842c24c085.png', label: 'Green tape' },
    { src: 'https://image2url.com/r2/default/images/1771134346194-cbfb6d4d-e881-4a63-b3ca-009b20336aba.png', label: 'Blue tape' },
    { src: 'https://image2url.com/r2/default/images/1771134382274-f0cac50d-78e7-42fd-b99e-ff8c69ea43d0.png', label: 'Paper star' },
    { src: 'https://image2url.com/r2/default/images/1771134411147-09486308-c7ba-4c0f-9dc3-abb6db271863.png', label: 'Paper heart' }
  ],
  flowers: [
    { src: 'https://image2url.com/r2/default/images/1771135993707-65db4a9f-82ab-4a20-8765-9dedf22237ec.png', label: 'Yellow blossom' },
    { src: 'https://image2url.com/r2/default/images/1771136083826-32c71802-a885-4c35-802e-39eda43b9b60.png', label: 'Peach flower' },
    { src: 'https://image2url.com/r2/default/images/1771136121768-495d48bc-4d9c-42dc-a379-658e74374b60.png', label: 'Orange flower' },
    { src: 'https://image2url.com/r2/default/images/1771136142669-94880547-d7ec-4da6-bf02-d006fdeb6362.png', label: 'Blue flower' },
    { src: 'https://image2url.com/r2/default/images/1771136166595-23fa547d-db97-4be9-a56d-7d3f6efe0b31.png', label: 'White flower' },
    { src: 'https://image2url.com/r2/default/images/1771136202445-001765bc-2c77-4fc1-95e6-5cf545d1eb80.png', label: 'Yellow flower' },
    { src: 'https://image2url.com/r2/default/images/1771136236355-ac96396f-c871-4b8d-9458-3987e738ae33.png', label: 'Babys breaths' }
  ],
  stickers: [
    { src: 'https://image2url.com/r2/default/images/1771137161578-581425f8-f3a4-47dc-b1d1-3baafd334a72.png', label: 'Boom Boom' },
    { src: 'https://image2url.com/r2/default/images/1771137191224-fbd5f684-5e5d-4ee0-8dc7-58cc0b7560e8.png', label: 'Happy B-Day' },
    { src: 'https://image2url.com/r2/default/images/1771137213028-0a106dd8-94ab-4416-99c5-58c8be6e55a4.png', label: 'Cake Slice' },
    { src: 'https://image2url.com/r2/default/images/1771137243939-3218679f-aa8b-425b-b613-430362d9d242.png', label: 'Bear' },
    { src: 'https://image2url.com/r2/default/images/1771137271498-ad676f53-caf6-407e-97f5-d8c516c8faa8.png', label: 'Candle' },
    { src: 'https://image2url.com/r2/default/images/1771137289040-6027199e-ae0e-46f5-ab22-c6c4e86b25f2.png', label: 'Party popper' }
  ]
};