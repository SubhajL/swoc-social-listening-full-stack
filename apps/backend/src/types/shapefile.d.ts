declare module 'shapefile' {
  interface ShapefileSource {
    read(): Promise<{ done: boolean; value?: { properties: any } }>;
  }

  interface ShapefileModule {
    open(path: string): Promise<ShapefileSource>;
  }

  const shapefile: ShapefileModule;
  export default shapefile;
} 