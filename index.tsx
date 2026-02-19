
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Pakker">
    <meta name="theme-color" content="#f2f2f7">
    
    <title>PakkeTracker DK</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --ios-bg: #f2f2f7; }
        body {
            font-family: 'Inter', sans-serif;
            -webkit-tap-highlight-color: transparent;
            background-color: var(--ios-bg);
            margin: 0;
            width: 100vw;
            height: 100vh;
            overflow-x: hidden;
        }
        .ios-blur {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        #root { height: 100%; }
    </style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.2.4",
    "react-dom/client": "https://esm.sh/react-dom@^19.2.4/client",
    "@google/genai": "https://esm.sh/@google/genai@^1.42.0",
    "react/": "https://esm.sh/react@^19.2.4/",
    "react-dom/": "https://esm.sh/react-dom@^19.2.4/"
  }
}
</script>
</head>
<body>
    <div id="root"></div>

    <script>
      Babel.registerPreset('typescript-react', {
        presets: [
          [Babel.availablePresets['typescript'], { allExtensions: true, isTSX: true }],
          [Babel.availablePresets['react']]
        ]
      });
    </script>

    <script type="text/babel" data-presets="typescript-react" data-type="module" src="./index.tsx"></script>
</body>
</html>
