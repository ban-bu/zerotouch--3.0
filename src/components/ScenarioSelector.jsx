import React from 'react';
import { ChevronDown } from 'lucide-react';

const ScenarioSelector = ({ scenarios, currentScenario, onScenarioChange }) => {
  const current = scenarios[currentScenario]

  return (
    <div className="flex items-center space-x-2">
      {Object.values(scenarios).map((scenario) => {
        const isActive = scenario.id === currentScenario
        return (
          <button
            key={scenario.id}
            onClick={() => onScenarioChange(scenario.id)}
            className={
              `flex items-center space-x-2 px-4 py-3 rounded-2xl border transition-all duration-200 backdrop-blur-sm ` +
              (isActive
                ? 'bg-white/25 text-gray-900 dark:text-white border-white/40 shadow-lg'
                : 'bg-white/15 text-gray-700 dark:text-gray-300 border-white/25 hover:bg-white/25')
            }
            title={scenario.description}
          >
            <div className={
              `p-1.5 rounded-xl transition-all duration-200 bg-white/30 border border-white/40 text-gray-700 dark:text-gray-200`}
            >
              <scenario.icon className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium">{scenario.name}</div>
          </button>
        )
      })}
    </div>
  )
}

export default ScenarioSelector