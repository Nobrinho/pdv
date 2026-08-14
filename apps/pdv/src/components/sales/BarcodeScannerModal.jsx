import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { Icon } from "../ui/Icon";

/**
 * Leitor de código de barras por câmera.
 *
 * Estratégia em duas camadas para funcionar em qualquer ambiente:
 *  1. BarcodeDetector nativo (Android/Chrome/ChromeOS) — caminho rápido.
 *  2. ZXing (@zxing/browser) como fallback — cobre desktop, iOS e Electron,
 *     onde a BarcodeDetector normalmente não existe. Foi por isso que a câmera
 *     "nem abria" antes: o modal só abria a câmera quando havia BarcodeDetector.
 *
 * Em ambos os casos a câmera é aberta via getUserMedia (câmera traseira quando
 * disponível). Requer contexto seguro (https ou localhost) — no Electron e no
 * dev local funciona direto.
 */
const ZXING_HINTS = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.QR_CODE,
    ],
  ],
]);

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"];

const BarcodeScannerModal = ({ isOpen, onClose, onDetected }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const zxingControlsRef = useRef(null);
  const [error, setError] = useState("");

  const hasNative = typeof window !== "undefined" && "BarcodeDetector" in window;

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        /* ignora */
      }
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError("");

    const emit = (value) => {
      if (cancelled || !value) return;
      stopCamera();
      onDetected(String(value));
    };

    const startNative = async () => {
      let detector;
      try {
        detector = new window.BarcodeDetector({ formats: NATIVE_FORMATS });
      } catch {
        detector = new window.BarcodeDetector();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const tick = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes && codes[0] && codes[0].rawValue;
          if (value) return emit(value);
        } catch {
          /* frame não pronto — continua */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const startZxing = async () => {
      const reader = new BrowserMultiFormatReader(ZXING_HINTS);
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false },
        videoRef.current,
        (result) => {
          if (result) emit(result.getText());
        },
      );
      if (cancelled) {
        try {
          controls.stop();
        } catch {
          /* ignora */
        }
        return;
      }
      zxingControlsRef.current = controls;
    };

    (async () => {
      try {
        if (hasNative) {
          await startNative();
        } else {
          await startZxing();
        }
      } catch (err) {
        // Se a via nativa falhar por algo diferente de permissão, tenta o ZXing.
        if (hasNative && err && err.name !== "NotAllowedError") {
          try {
            await startZxing();
            return;
          } catch (err2) {
            err = err2;
          }
        }
        setError(
          err && err.name === "NotAllowedError"
            ? "Permissão de câmera negada. Libere o acesso à câmera para escanear."
            : "Não foi possível acessar a câmera deste dispositivo.",
        );
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 pt-safe text-white">
        <span className="font-bold">Escanear código</span>
        <button onClick={handleClose} className="p-2 -mr-2" aria-label="Fechar">
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!error ? (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"></div>
            </div>
            <p className="absolute inset-x-0 bottom-10 text-center text-sm text-white/80">
              Aponte a câmera para o código de barras
            </p>
          </>
        ) : (
          <div className="px-8 text-center text-white/80">
            <Icon name="camera-off" size={30} className="mb-3" />
            <p className="text-sm">{error}</p>
            <button
              onClick={handleClose}
              className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
