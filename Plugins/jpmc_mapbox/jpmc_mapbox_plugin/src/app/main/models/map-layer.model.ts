export interface MapLayer {
  key: string;
  title: string;
  visible: boolean;
  ids: string[];
}

export interface MapInteractionCallbacks {
  onHoverEnter?: (feature: any, point: { x: number; y: number }) => void;
  onHoverMove?: (point: { x: number; y: number }) => void;
  onHoverLeave?: () => void;
}
