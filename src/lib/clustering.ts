import { useMemo } from "react";
import Supercluster from "supercluster";
import type { Region } from "react-native-maps";

export interface ClusterPoint {
  id: string;
  lat: number;
  lng: number;
  category?: string;
}

export type ClusterFeature =
  | {
      type: "cluster";
      id: number;
      lat: number;
      lng: number;
      count: number;
      expansionZoom: number;
    }
  | {
      type: "point";
      point: ClusterPoint;
      lat: number;
      lng: number;
    };

function regionToZoom(region: Region): number {
  // longitudeDelta spans the visible width; standard web-mercator zoom approximation.
  const zoom = Math.round(Math.log2(360 / Math.max(region.longitudeDelta, 1e-6)));
  return Math.min(Math.max(zoom, 1), 20);
}

/**
 * Cluster a list of geo points for the current map region — parity with the
 * web map's supercluster aggregation.
 */
export function useClusters(points: ClusterPoint[], region: Region): ClusterFeature[] {
  const index = useMemo(() => {
    const sc = new Supercluster<{ point: ClusterPoint }>({ radius: 60, maxZoom: 18 });
    sc.load(
      points.map((p) => ({
        type: "Feature" as const,
        properties: { point: p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return sc;
  }, [points]);

  return useMemo(() => {
    const zoom = regionToZoom(region);
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta,
      region.latitude - region.latitudeDelta,
      region.longitude + region.longitudeDelta,
      region.latitude + region.latitudeDelta,
    ];
    return index.getClusters(bbox, zoom).map<ClusterFeature>((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if (f.properties && (f.properties as any).cluster) {
        const props = f.properties as any;
        return {
          type: "cluster",
          id: props.cluster_id,
          lat,
          lng,
          count: props.point_count,
          expansionZoom: index.getClusterExpansionZoom(props.cluster_id),
        };
      }
      return { type: "point", point: (f.properties as any).point, lat, lng };
    });
  }, [index, region]);
}
