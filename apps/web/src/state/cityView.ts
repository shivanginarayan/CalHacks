import {create} from 'zustand';

export type LayerFilter = 'all' | 'money' | 'credit' | 'supply' | 'jobs';

export interface CityViewState {
 lod: 0 | 1 | 2 | 3;
 zoomed: boolean;
 districtFilter: string | null;
 focusLabel: string | null;
 activeLayer: LayerFilter;
 showCausalChain: boolean;
 hoveredEntityId: string | null;
 setDistrict: (district: string | null) => void;
 setActiveLayer: (layer: LayerFilter) => void;
 setShowCausalChain: (show: boolean | ((prev: boolean) => boolean)) => void;
 setHoveredEntityId: (id: string | null) => void;
}

// View-only state. No simulation tick, branch, or financial values live here.
export const useCityView = create<CityViewState>(set => ({
 lod: 0,
 zoomed: false,
 districtFilter: null,
 focusLabel: null,
 activeLayer: 'all',
 showCausalChain: false,
 hoveredEntityId: null,
 setDistrict: districtFilter => set({districtFilter}),
 setActiveLayer: activeLayer => set({activeLayer}),
 setShowCausalChain: show => set(s => ({showCausalChain: typeof show === 'function' ? show(s.showCausalChain) : show})),
 setHoveredEntityId: hoveredEntityId => set({hoveredEntityId})
}));
