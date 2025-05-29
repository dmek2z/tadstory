import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { dishName, ingredients, score } = await request.json()

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      console.error("Gemini API key not found in environment variables")
      throw new Error("Gemini API key not found")
    }

    let evaluationStyle = ""
    let tone = ""

    if (score >= 90) {
      evaluationStyle = "전설급 요리"
      tone =
        "극찬하며 감동적이고 유명한 셰프들(백종원, 고든 램지, 최현석, 연백호, 임지호, 정지선, 이연복, 조셉 리더 등)을 언급하면서 찬사를 보내는"
    } else if (score >= 80) {
      evaluationStyle = "최고급 요리"
      tone = "매우 칭찬하며 프로페셔널한 수준이라고 인정하는"
    } else if (score >= 70) {
      evaluationStyle = "고급 요리"
      tone = "격려하며 발전 가능성을 보여주는"
    } else {
      evaluationStyle = "일반급 요리"
      tone = "유머러스하게 혹독하게 비판하면서도 재미있게 표현하는"
    }

    const prompt = `
당신은 재미있고 유머러스한 요리 평가 전문가입니다. 
다음 요리를 평가해주세요:

요리명: ${dishName}
재료: ${ingredients.join(", ")}
점수: ${score}점 (100점 만점)
평가 등급: ${evaluationStyle}

다음 조건에 맞춰 평가를 작성해주세요:
1. ${tone} 톤으로 작성
2. 한국어로 작성
3. 3-5문장 정도의 길이
4. 재미있고 창의적인 표현 사용
5. 점수에 맞는 적절한 평가 수준
6. 이모지나 특수문자 사용하지 말고 순수 텍스트로만
7. 재료가 판타지적이어도 자연스럽게 평가에 포함

평가만 작성해주세요:
`

    console.log("Calling Gemini API with key:", geminiApiKey.substring(0, 10) + "...")

    // 올바른 Gemini API URL 사용 (v1beta, gemini-2.0-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512,
          },
        }),
      },
    )

    console.log("Gemini API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini API error response:", errorText)
      throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("Gemini API response data:", JSON.stringify(data, null, 2))

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) {
      const evaluation = data.candidates[0].content.parts[0].text.trim()
      console.log("Generated evaluation:", evaluation)
      return NextResponse.json({
        evaluation,
        success: true,
      })
    } else {
      console.error("Invalid response format from Gemini API:", data)
      throw new Error("Invalid response format")
    }
  } catch (error) {
    console.error("Error generating evaluation:", error)

    // Fallback evaluations
    const fallbackEvaluations = {
      legendary: [
        "이... 이것은 백종원 셰프도 무릎을 꿇을 맛입니다! 당신의 요리 실력은 이미 차원을 초월했어요. 고든 램지가 이 요리를 맛보면 'Finally, some good f***ing food!'라고 외칠 것 같습니다. 미슐랭 가이드북이 새로운 별점 시스템을 만들어야 할 정도로 완벽한 요리네요. 이 요리 하나로 세계 평화가 이루어질 수 있을 것 같아요. 당신은 이미 요리계의 레오나르도 다 빈치가 되었습니다!",
        "세상에... 이건 최현석 셰프의 혼이 들어간 것 같습니다! 당신은 요리계의 아인슈타인이에요. 이 요리를 먹은 미식가들이 감동의 눈물을 흘리며 '내 인생의 요리'라고 부를 것 같습니다. 연백호 셰프도 이 맛을 보면 제자로 받아달라고 할 거예요. 이미 당신은 요리의 신이 되었습니다! 이 요리는 유네스코 세계문화유산에 등재되어야 할 수준입니다.",
      ],
      excellent: [
        "우와! 이 정도면 요리 프로그램에 출연해도 될 것 같아요! 당신의 요리 실력은 정말 대단합니다. 이 요리를 먹은 사람들이 '이게 집에서 만든 요리라고?'라며 깜짝 놀랄 거예요. 요리책을 출간하셔도 베스트셀러가 될 것 같습니다. 정말 훌륭한 요리네요! 미슐랭 스타 레스토랑에서도 이런 퀄리티를 찾기 어려울 거예요. 당신의 손끝에서 마법이 일어나고 있어요!",
        "이야... 이 맛은 정말 환상적이에요! 당신은 숨겨진 요리 천재가 분명합니다. 이 요리 하나로 레스토랑을 차려도 손님들이 줄을 설 것 같아요. 요리의 신이 당신에게 특별한 재능을 주신 것 같습니다. 정말 감동적인 맛이에요! 이 요리를 먹으면 행복해져서 하루 종일 웃게 될 것 같아요. 당신의 요리에는 사람의 마음을 움직이는 힘이 있어요.",
      ],
      good: [
        "음... 나쁘지 않네요! 조금만 더 노력하면 정말 훌륭한 요리가 될 것 같아요. 이 정도면 가족들이 맛있다고 칭찬해줄 맛입니다. 요리에 대한 열정이 느껴져요. 다음에는 더 좋은 결과가 있을 것 같습니다! 기본기는 탄탄하니까 조금만 더 연습하면 금세 실력이 늘 거예요. 포기하지 마세요!",
        "오케이! 이 정도면 합격점이에요. 당신의 요리에는 발전 가능성이 보입니다. 조금만 더 연습하면 요리 고수가 될 수 있을 것 같아요. 맛은 괜찮지만 뭔가 특별한 무언가가 더 필요해 보여요. 창의성을 더 발휘해보시는 건 어떨까요? 당신만의 독특한 스타일을 찾아보세요!",
      ],
      terrible: [
        "어... 어떻게 이런 요리가 나올 수 있죠? 이것은 내 마지막 경고입니다. 두 번 다시 주방에 발을 들이지 마세요! 당신의 요리는 요리가 아니라 화학 실험의 실패작 같아요. 고든 램지가 보면 '이건 요리가 아니야! 재앙이야!'라고 소리칠 거예요. 요리책을 불태우고 배달 앱만 사용하시길 강력히 권합니다. 이 요리를 먹은 사람들이 병원에 실려갔다는 소문이... 제발 요리 대신 다른 취미를 찾아보세요!",
        "이건... 이건 요리라고 부를 수 없어요! 당신은 주방에서 영구 추방당해야 합니다. 이것은 내 마지막 경고요! 이 요리를 먹은 사람들이 119에 신고할 뻔했다는 소문이... 백종원 셰프가 이걸 보면 요리를 그만두고 싶어할 거예요. 제발 요리 대신 다른 취미를 찾아보세요! 당신의 요리는 생물학적 무기 수준이에요. 주방 출입을 금지시켜야겠어요!",
      ],
    }

    // Return fallback evaluation
    const { score } = await request.json()
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

    const fallbackEvaluation = fallbackArray[Math.floor(Math.random() * fallbackArray.length)]

    return NextResponse.json({
      evaluation: fallbackEvaluation,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
