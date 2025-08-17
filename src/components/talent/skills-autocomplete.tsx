'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Search } from 'lucide-react'

interface Skill {
  name: string
  category: string
  popularity: number
}

interface SelectedSkill {
  name: string
  level: 'junior' | 'mid' | 'senior' | 'expert'
  yearsExperience: number
}

interface SkillsAutocompleteProps {
  selectedSkills: SelectedSkill[]
  onSkillsChange: (skills: SelectedSkill[]) => void
  placeholder?: string
  maxSkills?: number
}

const SKILL_DATABASE: Skill[] = [
  // Frontend Technologies
  { name: 'React', category: 'Frontend', popularity: 95 },
  { name: 'Vue.js', category: 'Frontend', popularity: 85 },
  { name: 'Angular', category: 'Frontend', popularity: 80 },
  { name: 'Svelte', category: 'Frontend', popularity: 70 },
  { name: 'Next.js', category: 'Frontend', popularity: 90 },
  { name: 'Nuxt.js', category: 'Frontend', popularity: 75 },
  { name: 'TypeScript', category: 'Frontend', popularity: 92 },
  { name: 'JavaScript', category: 'Frontend', popularity: 98 },
  { name: 'HTML5', category: 'Frontend', popularity: 95 },
  { name: 'CSS3', category: 'Frontend', popularity: 95 },
  { name: 'Sass/SCSS', category: 'Frontend', popularity: 85 },
  { name: 'Tailwind CSS', category: 'Frontend', popularity: 88 },
  { name: 'Bootstrap', category: 'Frontend', popularity: 75 },
  { name: 'Material-UI', category: 'Frontend', popularity: 70 },
  { name: 'Styled Components', category: 'Frontend', popularity: 65 },

  // Backend Technologies
  { name: 'Node.js', category: 'Backend', popularity: 90 },
  { name: 'Python', category: 'Backend', popularity: 95 },
  { name: 'Java', category: 'Backend', popularity: 85 },
  { name: 'C#', category: 'Backend', popularity: 80 },
  { name: 'PHP', category: 'Backend', popularity: 75 },
  { name: 'Ruby', category: 'Backend', popularity: 65 },
  { name: 'Go', category: 'Backend', popularity: 78 },
  { name: 'Rust', category: 'Backend', popularity: 72 },
  { name: 'Kotlin', category: 'Backend', popularity: 70 },
  { name: 'Swift', category: 'Backend', popularity: 68 },

  // Frameworks
  { name: 'Express.js', category: 'Framework', popularity: 88 },
  { name: 'Django', category: 'Framework', popularity: 85 },
  { name: 'Flask', category: 'Framework', popularity: 80 },
  { name: 'FastAPI', category: 'Framework', popularity: 82 },
  { name: 'Spring Boot', category: 'Framework', popularity: 83 },
  { name: 'ASP.NET Core', category: 'Framework', popularity: 78 },
  { name: 'Laravel', category: 'Framework', popularity: 75 },
  { name: 'Ruby on Rails', category: 'Framework', popularity: 70 },
  { name: 'Fastify', category: 'Framework', popularity: 65 },

  // Databases
  { name: 'PostgreSQL', category: 'Database', popularity: 88 },
  { name: 'MySQL', category: 'Database', popularity: 85 },
  { name: 'MongoDB', category: 'Database', popularity: 82 },
  { name: 'Redis', category: 'Database', popularity: 80 },
  { name: 'SQLite', category: 'Database', popularity: 75 },
  { name: 'Elasticsearch', category: 'Database', popularity: 70 },
  { name: 'Cassandra', category: 'Database', popularity: 60 },
  { name: 'DynamoDB', category: 'Database', popularity: 65 },

  // Cloud & DevOps
  { name: 'AWS', category: 'Cloud', popularity: 92 },
  { name: 'Azure', category: 'Cloud', popularity: 85 },
  { name: 'Google Cloud', category: 'Cloud', popularity: 80 },
  { name: 'Docker', category: 'DevOps', popularity: 90 },
  { name: 'Kubernetes', category: 'DevOps', popularity: 85 },
  { name: 'Jenkins', category: 'DevOps', popularity: 75 },
  { name: 'GitLab CI', category: 'DevOps', popularity: 78 },
  { name: 'GitHub Actions', category: 'DevOps', popularity: 82 },
  { name: 'Terraform', category: 'DevOps', popularity: 80 },
  { name: 'Ansible', category: 'DevOps', popularity: 70 },

  // Tools & Others
  { name: 'Git', category: 'Tools', popularity: 98 },
  { name: 'GraphQL', category: 'API', popularity: 78 },
  { name: 'REST APIs', category: 'API', popularity: 95 },
  { name: 'Microservices', category: 'Architecture', popularity: 85 },
  { name: 'WebSockets', category: 'Communication', popularity: 70 },
  { name: 'gRPC', category: 'Communication', popularity: 65 },
  { name: 'OAuth', category: 'Security', popularity: 75 },
  { name: 'JWT', category: 'Security', popularity: 80 },
  { name: 'Unit Testing', category: 'Testing', popularity: 85 },
  { name: 'Integration Testing', category: 'Testing', popularity: 80 },
  { name: 'Jest', category: 'Testing', popularity: 85 },
  { name: 'Cypress', category: 'Testing', popularity: 75 },
  { name: 'Selenium', category: 'Testing', popularity: 70 }
]

const SKILL_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)', color: 'bg-green-100 text-green-800' },
  { value: 'mid', label: 'Mid (2-5 years)', color: 'bg-blue-100 text-blue-800' },
  { value: 'senior', label: 'Senior (5-8 years)', color: 'bg-purple-100 text-purple-800' },
  { value: 'expert', label: 'Expert (8+ years)', color: 'bg-orange-100 text-orange-800' }
]

export default function SkillsAutocomplete({
  selectedSkills,
  onSkillsChange,
  placeholder = "Search for skills...",
  maxSkills = 20
}: SkillsAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([])
  const [selectedSkillForLevel, setSelectedSkillForLevel] = useState<string | null>(null)
  const [tempLevel, setTempLevel] = useState<'junior' | 'mid' | 'senior' | 'expert'>('mid')
  const [tempYears, setTempYears] = useState(2)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = SKILL_DATABASE
        .filter(skill => 
          skill.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !selectedSkills.some(selected => selected.name === skill.name)
        )
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 10)
      
      setFilteredSkills(filtered)
      setIsOpen(true)
    } else {
      setFilteredSkills([])
      setIsOpen(false)
    }
  }, [searchTerm, selectedSkills])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedSkillForLevel(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSkillSelect = (skill: Skill) => {
    setSelectedSkillForLevel(skill.name)
    setSearchTerm('')
    setIsOpen(false)
    
    // Set default level based on skill popularity (more popular = likely more experience needed)
    const defaultLevel = skill.popularity > 90 ? 'senior' : skill.popularity > 80 ? 'mid' : 'junior'
    setTempLevel(defaultLevel)
    setTempYears(defaultLevel === 'senior' ? 5 : defaultLevel === 'mid' ? 3 : 1)
  }

  const confirmSkillAddition = () => {
    if (selectedSkillForLevel && selectedSkills.length < maxSkills) {
      const newSkill: SelectedSkill = {
        name: selectedSkillForLevel,
        level: tempLevel,
        yearsExperience: tempYears
      }
      
      onSkillsChange([...selectedSkills, newSkill])
      setSelectedSkillForLevel(null)
    }
  }

  const cancelSkillAddition = () => {
    setSelectedSkillForLevel(null)
  }

  const removeSkill = (skillName: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill.name !== skillName))
  }

  const updateSkillLevel = (skillName: string, level: SelectedSkill['level'], years: number) => {
    onSkillsChange(
      selectedSkills.map(skill =>
        skill.name === skillName 
          ? { ...skill, level, yearsExperience: years }
          : skill
      )
    )
  }

  const getSkillLevelInfo = (level: SelectedSkill['level']) => {
    return SKILL_LEVELS.find(l => l.value === level) || SKILL_LEVELS[1]
  }

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = []
    }
    acc[skill.category].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length > 0 && setIsOpen(true)}
            className="pl-10"
            disabled={selectedSkills.length >= maxSkills}
          />
        </div>

        {/* Dropdown */}
        {isOpen && filteredSkills.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto"
          >
            {Object.entries(groupedSkills).map(([category, skills]) => (
              <div key={category}>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                  {category}
                </div>
                {skills.map((skill) => (
                  <button
                    key={skill.name}
                    onClick={() => handleSkillSelect(skill)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between"
                  >
                    <span>{skill.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {skill.popularity}% popular
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skill Level Selection Modal */}
      {selectedSkillForLevel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">
              Set experience level for {selectedSkillForLevel}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Experience Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setTempLevel(level.value as any)}
                      className={`p-2 text-xs rounded-md border transition-colors ${
                        tempLevel === level.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Years of Experience</label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={tempYears}
                  onChange={(e) => setTempYears(parseInt(e.target.value) || 0)}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={confirmSkillAddition} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
                <Button variant="outline" onClick={cancelSkillAddition}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Selected Skills ({selectedSkills.length}/{maxSkills})
            </label>
          </div>
          
          <div className="space-y-2">
            {selectedSkills.map((skill, index) => {
              const levelInfo = getSkillLevelInfo(skill.level)
              return (
                <div
                  key={`${skill.name}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{skill.name}</span>
                    <Badge className={levelInfo.color}>
                      {levelInfo.label}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {skill.yearsExperience} year{skill.yearsExperience !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={skill.level}
                      onChange={(e) => updateSkillLevel(
                        skill.name, 
                        e.target.value as SelectedSkill['level'],
                        skill.yearsExperience
                      )}
                      className="text-xs border rounded px-2 py-1"
                    >
                      {SKILL_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.value}
                        </option>
                      ))}
                    </select>
                    
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={skill.yearsExperience}
                      onChange={(e) => updateSkillLevel(
                        skill.name,
                        skill.level,
                        parseInt(e.target.value) || 0
                      )}
                      className="w-16 text-xs border rounded px-2 py-1"
                    />
                    
                    <button
                      onClick={() => removeSkill(skill.name)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selectedSkills.length >= maxSkills && (
        <p className="text-sm text-amber-600">
          Maximum number of skills reached. Remove a skill to add more.
        </p>
      )}
    </div>
  )
}
