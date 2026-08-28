import { divIcon } from 'leaflet'

export function pinIcon() {
  return divIcon({
    className: '',
    html: `
      <div style="
        width: 14px; height: 14px; border-radius: 9999px;
        background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
        border: 2px solid #080808;
        box-shadow: 0 0 12px rgba(255,255,255,0.35);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  })
}
