// types.d.ts
declare module 'react-beautiful-dnd' {
  export type DropResult = {
    draggableId: string;
    type: string;
    source: {
      index: number;
      droppableId: string;
    };
    destination?: {
      droppableId: string;
      index: number;
    };
    reason: 'DROP' | 'CANCEL';
  };
}
