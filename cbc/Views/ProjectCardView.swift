//
//  ProjectCardView.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import SwiftUI

struct ProjectCardView: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(project.name)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text(project.description)
                .font(.body)
                .foregroundColor(Color(hex: "A0A0A0"))
                .fixedSize(horizontal: false, vertical: true)

            HStack {
                Text(project.status)
                    .font(.caption)
                    .foregroundColor(Color(hex: "0066FF"))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: "0066FF").opacity(0.2))
                    .cornerRadius(4)

                Spacer()
            }

            // Tech tags
            FlowLayout(spacing: 8) {
                ForEach(project.tech, id: \.self) { tech in
                    Text(tech)
                        .font(.caption2)
                        .foregroundColor(Color(hex: "A0A0A0"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color(hex: "1A1A1A"))
                        .cornerRadius(3)
                        .overlay(
                            RoundedRectangle(cornerRadius: 3)
                                .stroke(Color(hex: "A0A0A0").opacity(0.3), lineWidth: 0.5)
                        )
                }
            }
        }
        .padding(24)
        .background(Color(hex: "1A1A1A"))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.3), radius: 10, x: 0, y: 2)
    }
}

// Simple flow layout for tech tags
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}

#Preview {
    ProjectCardView(project: Project(
        name: "CLOS",
        description: "Cognitive Life Operating System - AI-augmented cognitive optimization using voice journaling and multi-modal analysis",
        status: "90-day self-experimentation protocol active",
        tech: ["iOS Shortcuts", "Voice transcription", "Pattern analysis"]
    ))
    .padding()
    .background(Color(hex: "0A0A0A"))
}
