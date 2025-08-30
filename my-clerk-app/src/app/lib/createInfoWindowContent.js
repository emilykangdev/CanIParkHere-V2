export function createParkingSignInfoWindow({
  signText,
  description,
  distance,
  googleMapsUrl,
  appleMapsUrl
}) {
  
  return `
    <div style="
      font-family: sans-serif;
      font-size: 14px;
      color: black;
      background: white;
      padding: 12px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      user-select: text;
      max-width: 300px;
    ">
      <!-- Title -->
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #ef4444;">
        🪧 Parking Sign
      </div>

      <!-- Sign Text -->
      <div style="
        background: #f8f9fa; 
        border-left: 4px solid #ef4444; 
        padding: 8px; 
        margin-bottom: 8px;
        white-space: pre-line;
        font-size: 13px;
        line-height: 1.4;
      ">
        ${signText}
      </div>

      <!-- Description and Distance -->
      <div style="margin-bottom: 10px;">
        ${description ? `<div style="font-weight: 600; color: #374151; margin-bottom: 4px; font-size: 14px;">${description}</div>` : ''}
        ${distance ? `<div style="color: #6b7280; font-size: 12px;">${distance}</div>` : ''}
      </div>

      <!-- Map Links -->
      <div style="display: flex; justify-content: space-around; gap: 8px;">
        <a href="${googleMapsUrl}" target="_blank" style="
          background: #4285f4; 
          color: white; 
          text-decoration: none; 
          padding: 6px 12px; 
          border-radius: 6px; 
          font-size: 12px;
          flex: 1;
          text-align: center;
        ">
          📍 Google Maps
        </a>
        <a href="${appleMapsUrl}" target="_blank" style="
          background: #007aff; 
          color: white; 
          text-decoration: none; 
          padding: 6px 12px; 
          border-radius: 6px; 
          font-size: 12px;
          flex: 1;
          text-align: center;
        ">
          🍎 Apple Maps
        </a>
      </div>

      <!-- Copy Button -->
      <button 
        id="copy-btn"
        style="
          background: #6b7280;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          width: 100%;
          margin-top: 8px;
        "
      >
        📋 Copy Sign Text
      </button>
    </div>
  `
}

export function createInfoWindowContent({
  title,
  description,
  googleMapsUrl,
  appleMapsUrl,
  copyLabel
}) {
  return `
    <div style="
      font-family: sans-serif;
      font-size: 14px;
      color: black;
      background: white;
      padding: 10px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      user-select: text;
      max-width: 280px;
      text-align: center;
    ">

    <!-- ✅ Title at the top -->
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
        ${title}
      </div>

      <!-- Address -->
      <div style="margin-bottom: 12px; font-weight: bold; font-size: 14px;">
        ${description}
      </div>

      <!-- Map Links -->
      <div style="display: flex; justify-content: space-around; gap: 8px; margin-bottom: 10px;">
        <a href="${googleMapsUrl}" target="_blank" style="
          background: #4285f4; 
          color: white; 
          text-decoration: none; 
          padding: 6px 12px; 
          border-radius: 6px; 
          font-size: 12px;
          flex: 1;
          text-align: center;
        ">
          📍 Google Maps
        </a>
        <a href="${appleMapsUrl}" target="_blank" style="
          background: #007aff; 
          color: white; 
          text-decoration: none; 
          padding: 6px 12px; 
          border-radius: 6px; 
          font-size: 12px;
          flex: 1;
          text-align: center;
        ">
          🍎 Apple Maps
        </a>
      </div>

        <button 
        id="find-parking-btn"
        style="
            background: #16a34a;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 6px;
        "
        >
        Find Parking Here
        </button>

                  <!-- Copy Button -->
      <!--<button 
        id="copy-btn"
        style="
          background: #2563eb;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          width: 100%;
          margin-bottom: 10px;
        "
      >
        ${copyLabel}
      </button>-->
    </div>
  `
}