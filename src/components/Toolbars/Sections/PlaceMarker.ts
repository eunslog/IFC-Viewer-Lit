import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";


function clearMarkers(components: OBC.Components, world: OBC.World) {
  const marker = components.get(OBF.Marker);
  const markerList = marker.getWorldMarkerList(world); 

  markerList.forEach((_, markerId) => {
      marker.delete(markerId); 
  });
}

export default function placeMarker(components: OBC.Components, world: OBC.World, expressIDs: any) {

  clearMarkers(components, world);

  const marker = components.get(OBF.Marker);
  marker.threshold = 10;

  const fragmentsManager = components.get(OBC.FragmentsManager);
  const boundingBoxer = components.get(OBC.BoundingBoxer);
  boundingBoxer.reset();

  expressIDs.forEach((item: { expressIDs: string }) => {
    try {
      const processedFragments = new Set<number>();

      if (!item || !item.expressIDs || typeof item.expressIDs !== "string") {
        console.error("Invalid expressIDs format:", item);
        return;
      }

      let idArray: number[][];
      try {
        idArray = JSON.parse(item.expressIDs);
      } catch (parseError) {
        console.error("Failed to parse expressIDs:", parseError);
        return;
      }

      if (!Array.isArray(idArray)) {
        console.error("Parsed expressIDs is not an array:", idArray);
        return;
      }

  
      const expressIdSet = new Set<number>(idArray.flat());

      boundingBoxer.reset();

      const fragmentsGroup = fragmentsManager.groups.values().next().value;
      if (!fragmentsGroup) {
        console.error("Not found fragments group.");
        return;
      }

      const fragmentMap = fragmentsGroup.getFragmentMap(expressIdSet);
      if (!fragmentMap) {
        console.error("Fragment map not found for expressId set:", expressIdSet);
        return;
      }

      let alreadyProcessed = false;
      expressIdSet.forEach(id => {
        if (processedFragments.has(id)) {
          alreadyProcessed = true;
          console.log(`Fragment ${id} 이미 생성됨, skipping.`);
        }
      });

      if (alreadyProcessed) {
        return;
      }


      for (const expressId of expressIdSet) {
        const vertices = fragmentsGroup.getItemVertices(expressId);
        if (!vertices || vertices.length === 0) {
            console.error("No vertices found for expressId:", expressId);
            continue; 
        }

        const box = new THREE.Box3().setFromPoints(vertices);
        const center = box.getCenter(new THREE.Vector3());

        if (center) {
             marker.create(world, "🚀", center);
        } else {
            console.log("No valid bounding sphere for fragment");
        }

      }
      
    } catch (error) {
      console.error("Error processing expressIDs item:", error);
    }
  });

  boundingBoxer.reset();

}