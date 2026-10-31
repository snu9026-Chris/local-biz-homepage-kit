#!/bin/bash
# 앱 창 하나만 캡처한다 — 화면 전체를 찍지 않는다(다른 앱의 개인정보가 섞이는 사고 방지).
# 사용: capture-app-window.sh <출력.png> [앱 이름, 기본 Claude]
# 출력: 저장 경로와 픽셀 크기. 창을 못 찾거나 창 목록을 못 읽으면 종료 코드 1(화면 전체로 대체하지 않는다).
out="$1"; app="${2:-Claude}"
[ -z "$out" ] && { echo "사용: $0 <출력.png> [앱 이름]" >&2; exit 2; }

tmpd=$(mktemp -d); trap 'rm -rf "$tmpd"' EXIT

# 창 번호 찾기 — 파이썬 Quartz 는 기본 설치가 아니라 swift(CoreGraphics)로 읽는다.
# 목록은 «앞에 있는 창부터» 정렬된다. 제목줄 조각(높이 30px 남짓)을 거르고, 조건을 넘는 «가장 앞 창»을 고른다
# — 모니터가 여러 대일 때 더 큰 뒤쪽 창이 아니라 사용자가 보고 있는 창을 찍기 위해서다.
cat > "$tmpd/win.swift" <<'EOF'
import Foundation
import CoreGraphics
let target = CommandLine.arguments[1]
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
  guard (w[kCGWindowOwnerName as String] as? String) == target,
        (w[kCGWindowLayer as String] as? Int) == 0,
        let b = w[kCGWindowBounds as String] as? [String: Any],
        let wd = (b["Width"] as? NSNumber)?.doubleValue, let ht = (b["Height"] as? NSNumber)?.doubleValue,
        wd >= 400, ht >= 300 else { continue }
  print(w[kCGWindowNumber as String] as! Int); break
}
EOF

if ! id=$(TMPDIR="$tmpd" swift "$tmpd/win.swift" "$app" 2>"$tmpd/err"); then
  echo "창 목록을 읽지 못함 (swift 실행 실패): $(head -1 "$tmpd/err")" >&2; exit 1
fi
[ -z "$id" ] && { echo "창을 찾지 못함: $app (앱이 최소화됐거나 다른 데스크톱에 있음)" >&2; exit 1; }

mkdir -p "$(dirname "$out")"
screencapture -x -o -l "$id" "$out" || exit 1
sips -g pixelWidth -g pixelHeight "$out" | awk -v p="$out" 'NR==2{w=$2} NR==3{h=$2} END{print p" "w"x"h}'
