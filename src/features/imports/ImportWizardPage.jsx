/**
 * @file ImportWizardPage.jsx
 * @description 4-step CSV import wizard at route "/imports/new".
 *
 * Steps:
 * 1. Select - File type + file upload
 * 2. Map - Column mapping (CSV → system fields)
 * 3. Validate - Row validation & preview
 * 4. Import - Execute import & show results
 *
 * State Management:
 * - Local state for wizard step, file, column mapping, parsed data, validation results
 * - Redux processImportThunk for the actual import execution
 *
 * Props: None (Route page component)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StepSelect } from './components/StepSelect';
import { StepMap } from './components/StepMap';
import { StepValidate } from './components/StepValidate';
import { StepImport } from './components/StepImport';
import {
  ArrowLeft,
  FileUp,
  Columns3,
  CheckCircle2,
  Upload,
  X
} from 'lucide-react';

const STEPS = [
  { key: 'select', label: 'Select File', icon: FileUp, num: 1 },
  { key: 'map', label: 'Map Columns', icon: Columns3, num: 2 },
  { key: 'validate', label: 'Validate', icon: CheckCircle2, num: 3 },
  { key: 'import', label: 'Import', icon: Upload, num: 4 }
];

export function ImportWizardPage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [fileType, setFileType] = useState('');
  const [file, setFile] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [mappedRows, setMappedRows] = useState([]);
  const [validationResult, setValidationResult] = useState(null);

  const handleCancel = () => navigate('/imports');

  const goToStep = (step) => {
    // When going backwards, reset downstream state
    if (step < currentStep) {
      if (step < 3) setValidationResult(null);
      if (step < 2) {
        setMappedRows([]);
        setValidationResult(null);
      }
      if (step < 1) {
        setColumnMapping({});
        setMappedRows([]);
        setValidationResult(null);
      }
    }
    setCurrentStep(step);
  };

  const handleFileTypeChange = useCallback((type) => {
    setFileType(type);
    // Reset downstream if file type changes
    setColumnMapping({});
    setMappedRows([]);
    setValidationResult(null);
  }, []);

  const handleFileChange = useCallback((f) => {
    setFile(f);
    setColumnMapping({});
    setMappedRows([]);
    setValidationResult(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Import</h1>
            <p className="text-xs text-slate-500">Upload and import CSV data into the system</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel} icon={<X className="w-4 h-4" />}>
          Cancel
        </Button>
      </div>

      {/* Step Indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-2.5">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isActive ? 'bg-slate-900 text-white shadow-sm' :
                    isCompleted ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-400'
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p className={clsx(
                      'text-xs font-semibold',
                      isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                    )}>
                      {step.label}
                    </p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={clsx(
                    'flex-1 h-px mx-3',
                    idx < currentStep ? 'bg-emerald-300' : 'bg-slate-200'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      <div>
        {currentStep === 0 && (
          <StepSelect
            fileType={fileType}
            onFileTypeChange={handleFileTypeChange}
            file={file}
            onFileChange={handleFileChange}
            onNext={() => goToStep(1)}
          />
        )}

        {currentStep === 1 && (
          <StepMap
            file={file}
            fileType={fileType}
            columnMapping={columnMapping}
            onMappingChange={setColumnMapping}
            onParsedDataReady={setMappedRows}
            onNext={() => goToStep(2)}
            onBack={() => goToStep(0)}
          />
        )}

        {currentStep === 2 && (
          <StepValidate
            fileType={fileType}
            mappedRows={mappedRows}
            validationResult={validationResult}
            onValidationComplete={setValidationResult}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}

        {currentStep === 3 && validationResult && (
          <StepImport
            fileType={fileType}
            fileName={file?.name || 'unknown.csv'}
            validRows={validationResult.validRows}
            invalidRows={validationResult.invalidRows}
            allErrors={validationResult.allErrors}
            totalRead={mappedRows.length}
            onBack={() => goToStep(2)}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}

export default ImportWizardPage;
