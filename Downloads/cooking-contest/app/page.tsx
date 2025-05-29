"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Trophy, Star, Sparkles, Heart, Zap, Crown, Gift, Loader2 } from "lucide-react"

// Footer component
const Footer = () => (
  <div className="mt-8 pt-6 border-t border-gray-200 text-center">
    <p className="text-sm text-gray-500">문의하기 | funnydony94@gmail.com</p>
  </div>
)

export default function Home() {
  const [nickname, setNickname] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [result, setResult] = useState(null)
  const [currentPage, setCurrentPage] = useState("main")
  const [expandedRank, setExpandedRank] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  // Mock ranking data
  const mockRankings = [
    {
      rank: 1,
      nickname: "요리마법사",
      dish: "무지개 용의 눈물 스튜",
      score: 98,
      ingredients: ["용의 눈물", "무지개 가루", "시간의 조각", "엄마의 사랑"],
      evaluation: "이 요리는 차원을 초월한 맛입니다! 용이 감동해서 울었다는 소문이...",
    },
    {
      rank: 2,
      nickname: "김치왕",
      dish: "김치 우주선 볶음",
      score: 95,
      ingredients: ["김치", "우주선 부품", "별가루", "미래의 소금"],
      evaluation: "우주 정거장에서도 주문이 들어올 정도로 맛있어요!",
    },
    {
      rank: 3,
      nickname: "파스타신",
      dish: "슬픔 파스타",
      score: 92,
      ingredients: ["슬픔 한 스푼", "면", "치즈", "희망"],
      evaluation: "먹으면서 울다가 웃게 되는 신기한 요리입니다.",
    },
    {
      rank: 4,
      nickname: "디저트요정",
      dish: "구름 케이크",
      score: 89,
      ingredients: ["구름", "설탕", "천사의 숨결"],
      evaluation: "입에서 녹아서 하늘로 올라갑니다.",
    },
    {
      rank: 5,
      nickname: "매운맛킬러",
      dish: "지옥불 라면",
      score: 87,
      ingredients: ["지옥불", "라면", "악마의 고추"],
      evaluation: "먹고 나면 용이 될 수 있습니다.",
    },
    {
      rank: 6,
      nickname: "단짠러버",
      dish: "달콤쌉싸름한 인생",
      score: 85,
      ingredients: ["인생", "설탕", "소금", "쓴맛"],
      evaluation: "인생의 모든 맛이 담겨있어요.",
    },
    {
      rank: 7,
      nickname: "해산물마니아",
      dish: "크라켄 다리 구이",
      score: 83,
      ingredients: ["크라켄 다리", "바다 소금", "파도"],
      evaluation: "바다의 왕이 인정한 맛입니다.",
    },
    {
      rank: 8,
      nickname: "채식주의자",
      dish: "요정의 샐러드",
      score: 81,
      ingredients: ["요정 채소", "이슬", "햇빛"],
      evaluation: "먹으면 날아다닐 수 있어요.",
    },
    {
      rank: 9,
      nickname: "고기러버",
      dish: "공룡 스테이크",
      score: 79,
      ingredients: ["공룡 고기", "원시 소금", "불"],
      evaluation: "쥬라기 시대의 맛을 재현했습니다.",
    },
    {
      rank: 10,
      nickname: "디저트킹",
      dish: "별사탕 아이스크림",
      score: 77,
      ingredients: ["별사탕", "우유", "꿈"],
      evaluation: "먹으면 소원이 이루어진다는 소문이...",
    },
  ]

  const dishNames = [
    "드래곤 날개 볶음탕",
    "유니콘 털 파스타",
    "요정의 눈물 수프",
    "무지개 치킨",
    "별빛 라면",
    "구름 케이크",
    "시간 여행자의 스튜",
    "마법사의 비밀 레시피",
    "천사의 브런치",
    "악마의 유혹 디저트",
    "우주 먼지 볶음밥",
    "꿈의 오믈렛",
    "사랑의 묘약 스무디",
    "행복한 팬케이크",
    "슬픔 치유 죽",
  ]

  // 한국 순위 계산 함수 (더 관대한 순위 시스템)
  const calculateKoreanRank = (score: number) => {
    if (score >= 95) {
      return Math.floor(Math.random() * 50) + 1 // 1-50위
    } else if (score >= 90) {
      return Math.floor(Math.random() * 200) + 51 // 51-250위
    } else if (score >= 85) {
      return Math.floor(Math.random() * 500) + 251 // 251-750위
    } else if (score >= 80) {
      return Math.floor(Math.random() * 1000) + 751 // 751-1,750위
    } else if (score >= 75) {
      return Math.floor(Math.random() * 2000) + 1751 // 1,751-3,750위
    } else if (score >= 70) {
      return Math.floor(Math.random() * 3000) + 3751 // 3,751-6,750위
    } else if (score >= 65) {
      return Math.floor(Math.random() * 5000) + 6751 // 6,751-11,750위
    } else {
      return Math.floor(Math.random() * 8000) + 11751 // 11,751-19,750위
    }
  }

  // Generate evaluation using API route
  const generateEvaluation = async (dishName: string, ingredients: string[], score: number) => {
    try {
      const response = await fetch("/api/generate-evaluation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dishName,
          ingredients,
          score,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate evaluation")
      }

      const data = await response.json()
      return data.evaluation
    } catch (error) {
      console.error("Error generating evaluation:", error)

      // Final fallback
      const fallbackEvaluations = {
        legendary: [
          "이... 이것은 백종원 셰프도 무릎을 꿇을 맛입니다! 당신의 요리 실력은 이미 차원을 초월했어요. 고든 램지가 이 요리를 맛보면 'Finally, some good f***ing food!'라고 외칠 것 같습니다. 미슐랭 가이드북이 새로운 별점 시스템을 만들어야 할 정도로 완벽한 요리네요. 이 요리 하나로 세계 평화가 이루어질 수 있을 것 같아요. 당신은 이미 요리계의 레오나르도 다 빈치가 되었습니다!",
        ],
        excellent: [
          "우와! 이 정도면 요리 프로그램에 출연해도 될 것 같아요! 당신의 요리 실력은 정말 대단합니다. 이 요리를 먹은 사람들이 '이게 집에서 만든 요리라고?'라며 깜짝 놀랄 거예요. 요리책을 출간하셔도 베스트셀러가 될 것 같습니다. 정말 훌륭한 요리네요! 미슐랭 스타 레스토랑에서도 이런 퀄리티를 찾기 어려울 거예요. 당신의 손끝에서 마법이 일어나고 있어요!",
        ],
        good: [
          "음... 나쁘지 않네요! 조금만 더 노력하면 정말 훌륭한 요리가 될 것 같아요. 이 정도면 가족들이 맛있다고 칭찬해줄 맛입니다. 요리에 대한 열정이 느껴져요. 다음에는 더 좋은 결과가 있을 것 같습니다! 기본기는 탄탄하니까 조금만 더 연습하면 금세 실력이 늘 거예요. 포기하지 마세요!",
        ],
        terrible: [
          "어... 어떻게 이런 요리가 나올 수 있죠? 이것은 내 마지막 경고입니다. 두 번 다시 주방에 발을 들이지 마세요! 당신의 요리는 요리가 아니라 화학 실험의 실패작 같아요. 고든 램지가 보면 '이건 요리가 아니야! 재앙이야!'라고 소리칠 거예요. 요리책을 불태우고 배달 앱만 사용하시길 강력히 권합니다.",
        ],
      }

      let fallbackArray = []
      if (score >= 90) {
        fallbackArray = fallbackEvaluations.legendary
      } else if (score >= 80) {
        fallbackArray = fallbackEvaluations.excellent
      } else if (score >= 70) {
        fallbackArray = fallbackEvaluations.good
      } else {
        fallbackArray = fallbackEvaluations.terrible
      }

      return fallbackArray[Math.floor(Math.random() * fallbackArray.length)]
    }
  }

  const generateDishImage = async (dishName: string, ingredients: string[], score: number) => {
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dishName,
          ingredients,
          score, // 점수도 전달
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate image")
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error generating image:", error)
      return {
        imageUrl: null,
        enhancedPrompt: null,
        success: false,
        emoji: score >= 90 ? "😍" : score >= 70 ? "😊" : score >= 50 ? "😐" : "😵",
      }
    }
  }

  // Update the generateResult function
  const generateResult = async () => {
    if (!nickname.trim() || !ingredients.trim()) return

    const ingredientList = ingredients
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item)
    const dishName = dishNames[Math.floor(Math.random() * dishNames.length)]
    const score = Math.floor(Math.random() * 40) + 60 // 60-100 range
    const koreanRank = calculateKoreanRank(score) // 한국 순위 계산

    const resultData = {
      nickname,
      dishName,
      score,
      evaluation: "평가 생성 중...", // 임시 텍스트
      ingredients: ingredientList,
      koreanRank, // 한국 순위로 변경
      imageUrl: null,
      imageLoading: true, // 항상 이미지 생성 시도
      enhancedPrompt: null,
      evaluationLoading: true,
      emoji: null,
      limitReached: false,
    }

    setResult(resultData)
    setCurrentPage("result")

    // 평가 생성 (API 호출)
    try {
      const evaluation = await generateEvaluation(dishName, ingredientList, score)
      setResult((prev) => ({
        ...prev,
        evaluation,
        evaluationLoading: false,
      }))
    } catch (error) {
      console.error("Failed to generate evaluation:", error)
      setResult((prev) => ({
        ...prev,
        evaluation: "평가 생성에 실패했습니다. 다시 시도해주세요.",
        evaluationLoading: false,
      }))
    }

    // 이미지 생성 (전역 한계 확인)
    try {
      const imageData = await generateDishImage(dishName, ingredientList, score)
      setResult((prev) => ({
        ...prev,
        imageUrl: imageData.imageUrl,
        imageLoading: false,
        enhancedPrompt: imageData.enhancedPrompt,
        emoji: imageData.emoji,
        limitReached: imageData.limitReached || false,
        message: imageData.message || null,
      }))
    } catch (error) {
      console.error("Failed to generate image:", error)
      setResult((prev) => ({
        ...prev,
        imageLoading: false,
        emoji: score >= 90 ? "😍" : score >= 70 ? "😊" : score >= 50 ? "😐" : "😵",
      }))
    }
  }

  const resetGame = () => {
    setCurrentPage("main")
    setNickname("")
    setIngredients("")
    setResult(null)
    setShowPrompt(false)
  }

  const shareResult = () => {
    const shareText = `🍳 요리 경연대회 결과 🍳\n\n👨‍🍳 요리사: ${result.nickname}\n🍽️ 요리명: ${result.dishName}\n⭐ 점수: ${result.score}점\n🇰🇷 한국 순위: ${result.koreanRank}위\n\n재료: ${result.ingredients.join(", ")}\n\n요리 경연대회에 참여해보세요! 🌟`

    if (navigator.share) {
      navigator
        .share({
          title: "요리 경연대회 결과",
          text: shareText,
          url: window.location.href,
        })
        .catch(console.error)
    } else {
      // 클립보드 복사
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          alert("결과가 클립보드에 복사되었습니다! 소셜 미디어에 붙여넣기 하세요 📋")
        })
        .catch(() => {
          // 클립보드 API가 지원되지 않는 경우
          const textArea = document.createElement("textarea")
          textArea.value = shareText
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
          alert("결과가 클립보드에 복사되었습니다! 소셜 미디어에 붙여넣기 하세요 📋")
        })
    }
  }

  const viewRankings = () => {
    setCurrentPage("rankings")
  }

  const goToMainPage = () => {
    setCurrentPage("main")
  }

  const togglePrompt = () => {
    setShowPrompt(!showPrompt)
  }

  if (currentPage === "result" && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-purple-800">요리 경연대회</h1>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
            </div>
          </div>

          {/* Result Card */}
          <Card className="mb-6 border-4 border-yellow-300 shadow-2xl bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardHeader className="text-center bg-gradient-to-r from-yellow-200 to-orange-200 rounded-t-lg">
              <div className="flex justify-center mb-2">
                <ChefHat className="w-12 h-12 text-orange-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-orange-800 mb-2">🍳 {result.dishName} 🍳</CardTitle>
              {/* Dish Emoji */}
              <div className="mb-4 flex justify-center">
                {result.imageLoading ? (
                  <div className="w-80 h-60 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg border-2 border-orange-200 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-orange-600 font-medium">이미지 생성 중...</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-80 h-60 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg border-2 border-orange-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-8xl mb-4">{result.emoji || "🍽️"}</div>
                      <p className="text-lg font-bold text-orange-600 mb-1">🍳 {result.dishName} 🍳</p>
                      <p className="text-sm text-orange-500">이미지 생성 불가</p>
                      <p className="text-xs text-orange-400 mt-1">크레딧 부족</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-6xl font-bold text-purple-600 mb-2">{result.score}점</div>
              <Badge className="bg-purple-500 text-white text-lg px-4 py-1">
                {result.score >= 90
                  ? "🏆 전설급"
                  : result.score >= 80
                    ? "🥇 최고급"
                    : result.score >= 70
                      ? "🥈 고급"
                      : "🥉 일반급"}
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-purple-700 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    평가
                    {result.evaluationLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </h3>
                  <div className="text-gray-700 bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                    {result.evaluationLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-purple-600">Gemini AI가 평가를 생성하고 있습니다...</span>
                      </div>
                    ) : (
                      <p>{result.evaluation}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-green-700 mb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    사용된 재료
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.map((ingredient: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="flex justify-center items-center gap-2 mb-2">
                    <Crown className="w-6 h-6 text-blue-600" />
                    <span className="text-lg font-bold text-blue-800">🇰🇷 한국 순위</span>
                    <Crown className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{result.koreanRank.toLocaleString()}위</div>
                  <p className="text-sm text-blue-600 mt-1">
                    {result.koreanRank <= 100
                      ? "🏆 상위 100위 안!"
                      : result.koreanRank <= 1000
                        ? "🥇 상위 1000위 안!"
                        : result.koreanRank <= 5000
                          ? "🥈 상위 5000위 안!"
                          : "🥉 계속 노력하세요!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={resetGame}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Zap className="w-5 h-5 mr-2" />
              다시하기
            </Button>
            <Button
              onClick={shareResult}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Gift className="w-5 h-5 mr-2" />
              공유하기
            </Button>
          </div>
          <Footer />
        </div>
      </div>
    )
  }

  if (currentPage === "rankings") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <Trophy className="w-10 h-10 text-yellow-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                명예의 전당 TOP 10
              </h1>
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
            <p className="text-lg text-gray-600">최고의 요리사들을 만나보세요! ✨</p>
          </div>

          {/* Rankings Card */}
          <Card className="border-2 border-yellow-300 shadow-xl bg-gradient-to-b from-yellow-50 to-orange-50">
            <CardHeader className="bg-gradient-to-r from-yellow-200 to-orange-200">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-orange-800">
                <Crown className="w-6 h-6" />🏆 실시간 랭킹 TOP 10
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {mockRankings.map((item) => (
                  <div key={item.rank}>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`${
                            item.rank === 1
                              ? "bg-yellow-500"
                              : item.rank === 2
                                ? "bg-gray-400"
                                : item.rank === 3
                                  ? "bg-orange-400"
                                  : "bg-blue-400"
                          } text-white font-bold`}
                        >
                          {item.rank}위
                        </Badge>
                        <div>
                          <div className="font-semibold text-gray-800">{item.nickname}</div>
                          <div className="text-sm text-gray-600">{item.dish}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">{item.score}점</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRank(expandedRank === item.rank ? null : item.rank)}
                          className="text-xs mt-1 hover:bg-purple-50"
                        >
                          자세히 보기
                        </Button>
                      </div>
                    </div>

                    {expandedRank === item.rank && (
                      <div className="mt-2 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                        <div className="mb-2">
                          <span className="font-semibold text-purple-700">재료: </span>
                          <span className="text-gray-700">{item.ingredients.join(", ")}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-purple-700">평가: </span>
                          <span className="text-gray-700">{item.evaluation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={goToMainPage}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <ChefHat className="w-5 h-5 mr-2" />
              요리하러 돌아가기
            </Button>
          </div>
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <ChefHat className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              요리 경연대회
            </h1>
            <ChefHat className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-lg text-gray-600">상상력이 곧 요리 실력! 어떤 재료든 환영해요 🌟</p>
        </div>

        {/* Input Form */}
        <Card className="border-2 border-purple-300 shadow-xl bg-gradient-to-b from-purple-50 to-pink-50 max-w-xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-purple-200 to-pink-200">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-purple-800">
              <Sparkles className="w-6 h-6" />🍳 나만의 요리 만들기
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">닉네임 입력</label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="요리마법사"
                className="border-2 border-purple-200 focus:border-purple-400 rounded-full px-4 py-3 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">
                식재료를 쉼표(,)로 구분하여 입력해주세요
              </label>
              <Textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="김치, 드래곤 심장, 슬픔 한 스푼, 무지개 가루..."
                className="border-2 border-purple-200 focus:border-purple-400 rounded-lg px-4 py-3 text-lg min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 현실과 상상의 재료 모두 입력 가능합니다. 예: 김치, 드래곤 심장, 슬픔 한 스푼
              </p>
            </div>

            <Button
              onClick={generateResult}
              disabled={!nickname.trim() || !ingredients.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 text-xl rounded-full shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <ChefHat className="w-6 h-6 mr-2" />🔥 요리하기 🔥
            </Button>

            <Button
              onClick={viewRankings}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold py-3 text-lg rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Trophy className="w-5 h-5 mr-2" />✨ 명예의 전당 TOP 10 ✨
            </Button>

            <div className="text-center text-sm text-gray-500 space-y-1">
              <p>✨ 상상력이 풍부할수록 높은 점수를 받을 수 있어요!</p>
              <p>🎭 재미있고 창의적인 재료를 사용해보세요!</p>
              <p className="text-xs text-blue-600">📸 현재 이미지 생성 대신 이모지가 표시됩니다</p>
            </div>
          </CardContent>
        </Card>
        <Footer />
      </div>
    </div>
  )
}
