//
//  TypingIndicatorView.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import SwiftUI

struct TypingIndicatorView: View {
    @State private var animationAmount = 0.0

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color(hex: "A0A0A0"))
                    .frame(width: 8, height: 8)
                    .opacity(animationAmount == Double(index) ? 1.0 : 0.3)
            }
        }
        .padding(16)
        .background(Color(hex: "1A1A1A"))
        .cornerRadius(16)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever()) {
                animationAmount = 2.0
            }
        }
    }
}

#Preview {
    TypingIndicatorView()
        .padding()
        .background(Color(hex: "0A0A0A"))
}
