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
              `flex items-center space-x-2 px-4 py-3 rounded-2xl border transition-all duration-200 backdrop-blur-sm div-with-background ` +
              (isActive
                ? 'bg-blue-500/90 text-white border-blue-500/50 shadow-lg'
                : 'text-gray-700 dark:text-gray-300 border-gray-300/50 dark:border-gray-600/50 hover:bg-white/90 dark:hover:bg-gray-700/90')
            }
            title={scenario.description}
          >
            <div className={
              `p-1.5 rounded-xl transition-all duration-200 ` +
              (isActive
                ? 'bg-gradient-to-br from-blue-400/80 to-purple-500/80 text-white backdrop-blur-sm'
                : 'div-with-background text-gray-600 dark:text-gray-400')
            }>
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