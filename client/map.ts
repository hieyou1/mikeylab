import 'leaflet/dist/leaflet.css';
// @ts-ignore
import markerRetinaIcon from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import shadowIcon from 'leaflet/dist/images/marker-shadow.png';

import L, { type Map as LeafletMap } from "leaflet";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerRetinaIcon,
    iconUrl: markerIcon,
    shadowUrl: shadowIcon
});

type SVGName = "ip" | "school" | "cloud";
type Latitude = number;
type Longitude = number;
type Magnification = number;
type Marker = [SVGName, Latitude, Longitude, Magnification?];

const OSM_TILE_LAYER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIB = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`;

export class MapHelper {
    private static readonly STATIC_OVERLAYS = [["school", 43.0825552, -77.691003]] as Marker[];
    private static readonly DEFAULT_MULTIPLIER = .1;
    private readonly map: LeafletMap;
    private mapSetup: boolean;
    private curLatLng: [number, number] | false = false;
    private locOverlay?: L.SVGOverlay;
    private staticOverlays: L.SVGOverlay[] = [];

    private static genOverlaySVG(svg: SVGName, lat: number, lng: number, multiplier: number = MapHelper.DEFAULT_MULTIPLIER): L.SVGOverlay {
        const elem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        elem.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        elem.setAttribute("viewBox", "0 0 32 32");
        elem.innerHTML = `<use xlink:href="dist/map.svg#${svg}"></use>`;
        return L.svgOverlay(elem, [[lat - multiplier, lng - multiplier], [lat + multiplier, lng + multiplier]]);
    }

    private addStaticOverlays() {
        for (const overlays of MapHelper.STATIC_OVERLAYS) {
            const marker = MapHelper.genOverlaySVG(...overlays).addTo(this.map);
            this.staticOverlays.push(marker);
        }
    }

    private async addCfServer(code: string) {
        const overlay = MapHelper.genOverlaySVG("cloud", ...(await (await fetch("/airport?code=" + code)).json() as [number, number]), .3).addTo(this.map);
        this.staticOverlays.push(overlay);
    }

    public async genMap(lat: number, lng: number, code: string) {
        if (!this.mapSetup) {
            this.mapSetup = true;

            L.tileLayer(OSM_TILE_LAYER, {
                maxZoom: 19,
                attribution: OSM_ATTRIB
            }).addTo(this.map);

            this.addStaticOverlays();
            await this.addCfServer(code);

            this.map.setView([lat, lng], 8);
        }
        if (this.curLatLng == false || !(lat == this.curLatLng[0] && lng == this.curLatLng[1])) {
            if (this.locOverlay) {
                this.locOverlay.remove();
            }
            this.locOverlay = MapHelper.genOverlaySVG("ip", lat, lng, .25);
            this.locOverlay.addTo(this.map);
            this.curLatLng = [lat, lng];
        }
    }

    constructor(elem: HTMLDivElement) {
        this.map = L.map(elem);
        elem.style.display = "";
        this.mapSetup = false;
    }
}