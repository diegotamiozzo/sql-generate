import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="md:col-span-12 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-start space-x-3 mb-4 shadow-sm">
      <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-bold text-rose-800">
          Atenção / Ocorreu um comportamento inesperado
        </h4>
        <p className="text-xs text-rose-700 mt-1 font-medium">{message}</p>
      </div>
    </div>
  );
}
