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

      <!-- Map Links Row -->
      <div style="display: flex; justify-content: space-around; margin-bottom: 10px;">
        <div style="text-align: center;">
          <a href="${googleMapsUrl}" target="_blank" title="Open in Google Maps" style="display: inline-block; padding: 6px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" 
                 alt="Google Maps" width="30" height="40" style="display: block; margin: 0 auto;" />
          </a>
          <div style="font-size: 11px; margin-top: 4px;">GMaps Link</div>
        </div>
        <div style="text-align: center;">
          <a href="${appleMapsUrl}" target="_blank" title="Open in Apple Maps" style="display: inline-block; padding: 6px;">
            <img src="https://images.seeklogo.com/logo-png/62/1/apple-maps-icon-logo-png_seeklogo-624688.png" 
                 alt="Apple Maps" width="40" height="40" style="display: block; margin: 0 auto;" />
          </a>
          <div style="font-size: 11px; margin-top: 4px;">Apple Link</div>
        </div>
      </div>

      <!-- Title -->
      <div style="margin-top: 6px; font-size: 13px; color: #555;">
        ${title}
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