import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";

export default function placeMarker(components: OBC.Components, world: OBC.World) {

  const marker = components.get(OBF.Marker);
  marker.threshold = 10;
  
  const fragments = components.get(OBC.FragmentsManager);
  const highlighter = components.get(OBF.Highlighter);
  const markerMap = new Map<string, { position: THREE.Vector3, count: number, labelMarkerId?: string }>();

  const placeMarkerOnSelected = () => {
    const boundingBoxer = components.get(OBC.BoundingBoxer);
    boundingBoxer.reset();

    const selectedFragments = highlighter.selection.select;
    if (Object.keys(selectedFragments).length === 0) {
      console.log("No fragments selected.");
      return;
    }

    const fragmentID = Object.keys(selectedFragments)[0];
    const fragment = fragments.list.get(fragmentID);

    if (!fragment) return;

    const expressIDs = selectedFragments[fragmentID];

    boundingBoxer.addMesh(fragment.mesh, expressIDs);

    const boundingSphere = boundingBoxer.getSphere();
    if (boundingSphere) {

        const center = boundingSphere.center;

        const positionKey = `${center.x.toFixed(2)}_${center.y.toFixed(2)}_${center.z.toFixed(2)}`;

        marker.create(world, "🚀", center);

        if (markerMap.has(positionKey)) {
            const markerData = markerMap.get(positionKey)!;
            markerData.count++;

            // Delete previous marker
            if (markerData.labelMarkerId) {
                marker.delete(markerData.labelMarkerId);
            }

            // Create new label
            const label = `${markerData.count}`; 
            const offsetPosition = center.clone();
            offsetPosition.x += 0.1;

            const newLabelMarkerId = marker.create(world, label, offsetPosition); 
            markerData.labelMarkerId = newLabelMarkerId || "";

    } else {
      markerMap.set(positionKey, { position: center, count: 1 });
    }
  } else {
    console.log("No valid bounding sphere for fragment", fragmentID);
  }

  boundingBoxer.reset(); 
};

return placeMarkerOnSelected;
}