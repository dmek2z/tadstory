import { type NextRequest, NextResponse } from "next/server"

// 전역 이미지 생성 카운터 (실제 운영에서는 데이터베이스나 Redis 사용 권장)
let dailyImageCount = 0
let lastResetDate = new Date().toDateString()

export async function POST(request: NextRequest) {
  try {
    const { dishName, ingredients, score } = await request.json()

    // 날짜가 바뀌면 카운터 리셋
    const today = new Date().toDateString()
    if (lastResetDate !== today) {
      dailyImageCount = 0
      lastResetDate = today
    }

    // 점수에 따른 이모지 선택
    let emoji = "🍽️"
    if (score >= 95) {
      emoji = "🤩" // 매우 높은 점수
    } else if (score >= 90) {
      emoji = "😍" // 높은 점수
    } else if (score >= 80) {
      emoji = "😋" // 좋은 점수
    } else if (score >= 70) {
      emoji = "😊" // 괜찮은 점수
    } else if (score >= 60) {
      emoji = "😐" // 보통 점수
    } else if (score >= 50) {
      emoji = "😕" // 낮은 점수
    } else {
      emoji = "😵" // 매우 낮은 점수
    }

    // 현재는 Stability AI 크레딧이 부족하므로 항상 이모지 반환
    return NextResponse.json({
      imageUrl: null,
      enhancedPrompt: null,
      method: "emoji-fallback",
      success: false,
      emoji: emoji,
      limitReached: false,
      dailyCount: dailyImageCount,
      error: "Stability AI credits insufficient",
      message: "현재 이미지 생성 서비스를 이용할 수 없습니다. 대신 이모지가 표시됩니다.",
    })

    /* 아래 코드는 Stability AI 크레딧이 있을 때 활성화할 수 있습니다.
    // 전역 일일 한계 확인 (10장)
    if (dailyImageCount >= 10) {
      console.log("Daily image generation limit reached globally")
      return NextResponse.json({
        imageUrl: null,
        enhancedPrompt: null,
        method: "emoji-fallback",
        success: false,
        emoji: emoji,
        limitReached: true,
        dailyCount: dailyImageCount,
        error: "Daily image generation limit reached",
      })
    }

    const stabilityApiKey = process.env.STABILITY_API_KEY

    if (!stabilityApiKey) {
      console.log("Stability API key not configured, using emoji fallback")
      return NextResponse.json({
        imageUrl: null,
        enhancedPrompt: null,
        method: "emoji-fallback",
        success: false,
        emoji: emoji,
        limitReached: false,
        dailyCount: dailyImageCount,
        error: "Stability API key not configured",
      })
    }

    // Stability AI만 사용하여 이미지 생성
    const prompt = `Professional food photography of ${dishName}, an artistic culinary creation made with ${ingredients.join(", ")}. Beautifully plated, perfect lighting, vibrant colors, appetizing presentation, high resolution, restaurant quality, shallow depth of field, gourmet style.`

    console.log("Generating image with Stability AI, current count:", dailyImageCount)

    const stabilityResponse = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stabilityApiKey}`,
        Accept: "image/*",
      },
      body: (() => {
        const formData = new FormData()
        formData.append("prompt", prompt)
        formData.append("mode", "text-to-image")
        formData.append("model", "sd3.5-large")
        formData.append("aspect_ratio", "3:2")
        formData.append("output_format", "jpeg")
        formData.append("style_preset", "photographic")
        return formData
      })(),
    })

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text()
      console.error("Stability AI API error:", errorText)
      return NextResponse.json({
        imageUrl: null,
        enhancedPrompt: null,
        method: "emoji-fallback",
        success: false,
        emoji: emoji,
        limitReached: false,
        dailyCount: dailyImageCount,
        error: `Stability AI API error: ${stabilityResponse.status} - Credits insufficient or other API error`,
      })
    }

    // 성공적으로 생성된 경우 전역 카운터 증가
    dailyImageCount++
    console.log("Image generated successfully, new count:", dailyImageCount)

    // 이미지 데이터를 Base64로 변환
    const imageBuffer = await stabilityResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const imageUrl = `data:image/jpeg;base64,${base64Image}`

    return NextResponse.json({
      imageUrl,
      enhancedPrompt: prompt,
      method: "stability-ai",
      success: true,
      dailyCount: dailyImageCount,
    })
    */
  } catch (error) {
    console.error("Error generating image:", error)

    // 에러 발생 시 점수에 따른 이모지 반환
    const { score } = await request.json()
    let emoji = "🍽️"
    if (score >= 95) {
      emoji = "🤩"
    } else if (score >= 90) {
      emoji = "😍"
    } else if (score >= 80) {
      emoji = "😋"
    } else if (score >= 70) {
      emoji = "😊"
    } else if (score >= 60) {
      emoji = "😐"
    } else if (score >= 50) {
      emoji = "😕"
    } else {
      emoji = "😵"
    }

    return NextResponse.json({
      imageUrl: null,
      enhancedPrompt: null,
      method: "emoji-fallback",
      success: false,
      emoji: emoji,
      dailyCount: dailyImageCount,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
