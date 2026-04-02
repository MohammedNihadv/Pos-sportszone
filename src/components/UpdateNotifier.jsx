import { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle } from 'lucide-react';

export default function UpdateNotifier() {
  const [update, setUpdate] = useState(null);       // { version }
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.api?.onUpdateAvailable) return;

    window.api.onUpdateAvailable((data) => {
      setUpdate(data);
      setDismissed(false);
    });

    window.api.onUpdateProgress((data) => {
      setProgress(data.percent);
    });

    window.api.onUpdateDownloaded((data) => {
      setDownloaded(true);
      setDownloading(false);
    });
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    window.api?.downloadUpdate();
  };

  const handleInstall = () => {
    window.api?.installUpdate();
  };

  if (dismissed || !update) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9998] animate-slide-up">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-80">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Update Available</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">v{update.version}</p>
            </div>
          </div>
          {!downloading && !downloaded && (
            <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {downloaded ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Download complete!</span>
            </div>
            <button
              onClick={handleInstall}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
            >
              Restart & Update
            </button>
          </div>
        ) : downloading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Downloading... {progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setDismissed(true)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Later
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
            >
              Update Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
